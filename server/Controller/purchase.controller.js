import Stripe from "stripe";
import mongoose from "mongoose";
import Purchase from "../models/purchase.model.js";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import CourseProgress from "../models/courseProgress.model.js";
import Review from "../models/review.model.js";
import Contact from "../models/contact.model.js";
import { sendEnrollmentEmail } from "../utils/email.js";
import { sendError } from "../utils/errorHandler.js";

// Helper to get Stripe instance (BUG-022 FIX: Singleton)
let stripeInstance = null;
export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not defined in environment variables",
    );
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

import Coupon from "../models/coupon.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { courseIds, courseId, couponCode } = req.body;
    const userId = req.user.id;

    // Support both courseIds (array) and single courseId (string)
    let targetCourseIds = [];
    if (Array.isArray(courseIds) && courseIds.length > 0) {
      targetCourseIds = courseIds.filter(Boolean);
    } else if (courseId) {
      targetCourseIds = [courseId];
    } else if (typeof courseIds === "string" && courseIds.trim()) {
      targetCourseIds = [courseIds.trim()];
    }

    if (targetCourseIds.length === 0) {
      return res.status(400).json({ success: false, message: "No courses selected" });
    }

    const courses = await Course.find({ _id: { $in: targetCourseIds } });
    if (courses.length !== targetCourseIds.length) {
      return res.status(404).json({ success: false, message: "One or more courses not found" });
    }

    // Safely look up user (compatible with both Mongoose ObjectId and Better Auth IDs)
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    // Check enrollment for all courses
    if (user) {
      const alreadyEnrolled = courses.some(course => 
        user.enrolledCourses?.some(id => id.toString() === course._id.toString())
      );

      if (alreadyEnrolled) {
        return res.status(400).json({ success: false, message: "You are already enrolled in one or more of these courses." });
      }
    }

    // Calculate total price
    const subtotal = courses.reduce((acc, course) => {
      const discountPct = course.discount || 0;
      const price = discountPct > 0 
        ? Math.round(course.price * (1 - discountPct / 100))
        : course.price;
      return acc + price;
    }, 0);

    // Apply Coupon if provided
    let finalAmount = subtotal;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOneAndUpdate(
        { 
          code: couponCode.toUpperCase(), 
          isActive: true, 
          expiresAt: { $gt: new Date() },
          $expr: { $lt: ["$usedCount", "$usageLimit"] }
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );

      if (coupon) {
        if (subtotal >= coupon.minPurchaseAmount) {
          let discount = 0;
          if (coupon.discountType === "percentage") {
            discount = (subtotal * coupon.discountAmount) / 100;
          } else {
            discount = coupon.discountAmount;
          }
          finalAmount = Math.max(0, subtotal - discount);
          appliedCoupon = coupon;
        } else {
          // If min purchase amount not met, rollback the usage count
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: -1 } });
        }
      }
    }

    // If final amount is 0 (e.g. 100% coupon or 0 price), enroll immediately without Stripe
    if (finalAmount <= 0) {
      for (const cId of targetCourseIds) {
        if (user && !user.enrolledCourses.some(id => id.toString() === cId.toString())) {
          user.enrolledCourses.push(cId);
        }
        await Course.findByIdAndUpdate(cId, {
          $addToSet: { enrolledStudents: user ? user._id : userId }
        });
        await Purchase.create({
          courseId: cId,
          userId: user ? user._id : userId,
          amount: 0,
          status: "completed",
          paymentId: `free_${Date.now()}_${cId}`,
          couponCode: couponCode || "",
        });
      }
      if (user) await user.save();

      return res.status(200).json({
        success: true,
        url: `${process.env.CLIENT_URL}/purchase-success?courseId=${targetCourseIds[0]}`,
        message: "Enrolled successfully!",
      });
    }

    // Create Stripe checkout session
    const stripe = getStripe();
    
    // Prepare line items
    const line_items = courses.map(course => {
        const discountPct = course.discount || 0;
        const discountedPrice = discountPct > 0 
            ? Math.round(course.price * (1 - discountPct / 100))
            : course.price;
        
        return {
          price_data: {
            currency: "bdt",
            product_data: {
              name: course.courseTitle || "Course",
              description: course.subTitle || "Course enrollment",
            },
            unit_amount: Math.round(discountedPrice * 100),
          },
          quantity: 1,
        };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: finalAmount === subtotal ? line_items : [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Course Bundle Checkout",
              description: `Total for ${courses.length} course(s) ${couponCode ? `(Coupon ${couponCode} applied)` : ""}`,
            },
            unit_amount: Math.round(finalAmount * 100),
          },
          quantity: 1,
        }
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}&courseId=${targetCourseIds[0]}`,
      cancel_url: targetCourseIds.length === 1 
        ? `${process.env.CLIENT_URL}/courseDetails/${targetCourseIds[0]}`
        : `${process.env.CLIENT_URL}/cart`,
      metadata: {
        courseIds: targetCourseIds.join(","),
        userId: user ? user._id.toString() : userId.toString(),
        couponCode: couponCode || "",
      },
    });

    // Create pending purchase records for EACH course
    for (const cId of targetCourseIds) {
      await Purchase.create({
        courseId: cId,
        userId: user ? user._id : userId,
        amount: finalAmount / targetCourseIds.length, // Prorated amount
        status: "pending",
        paymentId: session.id,
        couponCode: couponCode || "",
      });
    }

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe Session Error Details:", error);
    return sendError(res, error, "createCheckoutSession");
  }
};

export const verifyCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed or session not found",
      });
    }

    const { courseIds, couponCode } = session.metadata || {};
    let targetCourseIds = [];
    if (courseIds) {
      targetCourseIds = courseIds.split(",").filter(Boolean);
    }

    // Look up user safely
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update purchases to completed
    await Purchase.updateMany(
      { paymentId: session.id },
      { status: "completed" }
    );

    // Enroll user in all target courses
    for (const cId of targetCourseIds) {
      if (!user.enrolledCourses.some((id) => id.toString() === cId.toString())) {
        user.enrolledCourses.push(cId);
      }
      await Course.findByIdAndUpdate(cId, {
        $addToSet: { enrolledStudents: user._id },
      });

      // Initialize CourseProgress
      const existingProgress = await CourseProgress.findOne({
        courseId: cId,
        userId: user._id,
      });
      if (!existingProgress) {
        await CourseProgress.create({
          courseId: cId,
          userId: user._id,
          completedLectures: [],
        });
      }

      // Send enrollment email
      const course = await Course.findById(cId);
      if (course) {
        sendEnrollmentEmail(user.email, user.name, course.courseTitle).catch(
          (err) => console.error("Enrollment email error:", err.message),
        );
      }
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Enrollment verified and completed successfully!",
      courseId: targetCourseIds[0],
      courses: user.enrolledCourses,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return sendError(res, error, "verifyCheckoutSession");
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  const stripe = getStripe();

  try {
    // If we're using express.raw, req.body is a Buffer
    const payload = req.body;
    const sig = req.headers["stripe-signature"];

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // Production mode with signature verification
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } else if (process.env.NODE_ENV === "production") {
      // Missing signature or secret in production is a critical security failure
      console.error(
        "FATAL: Stripe Webhook received in production without valid signature/secret.",
      );
      return res
        .status(401)
        .json({ success: false, message: "Invalid Signature" });
    } else {
      // Fallback/Testing mode: parse the buffer directly (only outside production)
      event = JSON.parse(payload.toString());
      console.log(
        "Webhook received (parsed from Buffer) [NON-PROD]:",
        event.type,
      );
    }
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { courseIds, userId, couponCode } = session.metadata;
    const courseIdArray = courseIds.split(",");

    try {
      console.log("Processing fulfillment for session:", session.id);

      // 1. Update purchase status for ALL courses in this session
      const purchases = await Purchase.find({ paymentId: session.id });
      
      // BUG-002 FIX: Idempotency check should ensure ALL purchases are completed.
      // Previously it only checked purchases[0], meaning if a multi-course purchase 
      // partially completed, it might skip processing the rest.
      const allCompleted = purchases.length > 0 && purchases.every(p => p.status === "completed");
      if (allCompleted) {
        console.log("Session already processed, skipping:", session.id);
        return res.status(200).json({ received: true });
      }
      
      for (const purchase of purchases) {
          const course = await Course.findById(purchase.courseId);
          const accessDays = course?.accessDuration || 365;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + accessDays);
          
          purchase.status = "completed";
          purchase.expiryDate = expiryDate;
          await purchase.save();
      }

      // Note: Coupon usedCount is now atomically incremented during checkout session creation
      // to prevent race conditions. We no longer increment it here.

      // 3. Enroll user in ALL courses
      const user = await User.findById(userId);
      if (user) {
        for (const cId of courseIdArray) {
          if (!user.enrolledCourses.includes(cId)) {
            user.enrolledCourses.push(cId);
          }
        }
        await user.save();
      }

      // 4. Add user to ALL courses student lists
      for (const cId of courseIdArray) {
        await Course.findByIdAndUpdate(cId, {
          $addToSet: { enrolledStudents: userId }
        });
        
        // Send email for each course (or a consolidated one?)
        const course = await Course.findById(cId);
        if (user && course) {
          sendEnrollmentEmail(user.email, user.name, course.courseTitle).catch(err => 
            console.error("Enrollment email failed:", err.message)
          );
        }
      }

      console.log("Enrollment fulfillment complete for user:", userId);
    } catch (error) {
      console.error("Webhook Fulfillment Error:", error);
    }
  }

  res.status(200).json({ received: true });
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let courseQuery = {};
    let purchaseQuery = {};
    if (userRole === "teacher") {
      // Teachers only see their own courses
      const teacherCourses = await Course.find({ creator: userId });
      const courseIds = teacherCourses.map((course) => course._id);
      purchaseQuery = { courseId: { $in: courseIds } };
      courseQuery = { creator: userId };
    }
    // Admins see everything (empty query)

    // --- Existing: Revenue & Sales ---
    const purchases = await Purchase.find({
      ...purchaseQuery,
      status: "completed",
    }).populate("courseId");

    const totalRevenue = purchases.reduce((acc, curr) => acc + curr.amount, 0);
    const totalSales = purchases.length;

    // Aggregate stats by course
    const courseStatsMap = {};
    purchases.forEach((purchase) => {
      const cId = purchase.courseId?._id?.toString();
      const courseTitle = purchase.courseId?.courseTitle || "Unknown Course";
      if (!courseStatsMap[cId]) {
        courseStatsMap[cId] = { name: courseTitle, revenue: 0, sales: 0 };
      }
      courseStatsMap[cId].revenue += purchase.amount;
      courseStatsMap[cId].sales += 1;
    });
    const courseStats = Object.values(courseStatsMap);

    // --- NEW: Total Students ---
    const totalStudents = await User.countDocuments({ role: "student" });

    // --- NEW: Active (Published) Courses ---
    const activeCourses = await Course.countDocuments({
      ...courseQuery,
      isPublished: true,
    });

    // --- NEW: Completion Rate ---
    const allCourses = await Course.find(courseQuery).select("_id");
    const allCourseIds = allCourses.map((c) => c._id);
    const totalProgressEntries = await CourseProgress.countDocuments({
      courseId: { $in: allCourseIds },
    });
    const completedProgressEntries = await CourseProgress.countDocuments({
      courseId: { $in: allCourseIds },
      isCompleted: true,
    });
    const completionRate =
      totalProgressEntries > 0
        ? Math.round((completedProgressEntries / totalProgressEntries) * 100)
        : 0;

    // --- NEW: Engagement & Revenue Trend (last 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentPurchases = await Purchase.find({
      ...purchaseQuery,
      status: "completed",
      createdAt: { $gte: thirtyDaysAgo },
    }).select("createdAt amount");

    // Initialize map for all 30 days
    const trendMap = {};
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        trendMap[key] = { enrollments: 0, revenue: 0 };
    }

    recentPurchases.forEach(p => {
        const key = new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        if (trendMap[key]) {
            trendMap[key].enrollments++;
            trendMap[key].revenue += p.amount;
        }
    });

    const trendData = Object.entries(trendMap).map(([name, data]) => ({
        name,
        enrollments: data.enrollments,
        revenue: data.revenue
    }));

    // --- NEW: Recent Activity (last 5 enrollments) ---
    const recentEnrollments = await Purchase.find({
      ...purchaseQuery,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name profilePicture")
      .populate("courseId", "courseTitle");

    const recentCompletions = await CourseProgress.find({
      courseId: { $in: allCourseIds },
      isCompleted: true,
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("userId", "name profilePicture")
      .populate("courseId", "courseTitle");

    // Merge and sort by time, take top 5
    const activityItems = [
      ...recentEnrollments.map((e) => ({
        type: "enrollment",
        userName: e.userId?.name || "Unknown",
        userAvatar: e.userId?.profilePicture || "",
        action: `enrolled in ${e.courseId?.courseTitle || "a course"}`,
        time: e.createdAt,
      })),
      ...recentCompletions.map((c) => ({
        type: "completion",
        userName: c.userId?.name || "Unknown",
        userAvatar: c.userId?.profilePicture || "",
        action: `completed ${c.courseId?.courseTitle || "a course"}`,
        time: c.updatedAt,
      })),
    ];
    activityItems.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivity = activityItems.slice(0, 5);

    // --- NEW: Category Enrollment ---
    const allCoursesWithCategory = await Course.find(courseQuery).select(
      "category enrolledStudents",
    );
    const categoryMap = {};
    allCoursesWithCategory.forEach((course) => {
      const cat = course.category || "Uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = 0;
      }
      categoryMap[cat] += course.enrolledStudents?.length || 0;
    });
    const categoryColors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const categoryEnrollment = Object.entries(categoryMap)
      .map(([name, value], i) => ({
        name,
        value,
        color: categoryColors[i % categoryColors.length],
      }))
      .sort((a, b) => b.value - a.value);

    // --- NEW: Admin-Only Stats (Hide from Teachers) ---
    let adminStats = {
      draftCoursesCount: 0,
      bannedUsersCount: 0,
      unreadMessagesCount: 0,
    };

    if (userRole === "admin") {
      adminStats.draftCoursesCount = await Course.countDocuments({ isPublished: false });
      adminStats.bannedUsersCount = await User.countDocuments({ isBanned: true });
      adminStats.unreadMessagesCount = await Contact.countDocuments({ isRead: false });
    }

    // --- NEW: Recent Reviews ---
    let recentReviews = [];
    if (userRole === "admin") {
      recentReviews = await Review.find()
        .limit(5)
        .sort({ createdAt: -1 })
        .populate("userId", "name profilePicture")
        .populate("courseId", "courseTitle");
    } else if (userRole === "teacher") {
      const teacherCourses = await Course.find({ creator: userId });
      const myCourseIds = teacherCourses.map((c) => c._id);
      recentReviews = await Review.find({ courseId: { $in: myCourseIds } })
        .limit(5)
        .sort({ createdAt: -1 })
        .populate("userId", "name profilePicture")
        .populate("courseId", "courseTitle");
    }

    // --- NEW: Recent Contacts ---
    // BUG-023 FIX: Only admins should see contact messages
    let recentContacts = [];
    if (userRole === "admin") {
      recentContacts = await Contact.find()
        .limit(5)
        .sort({ createdAt: -1 });
    }

    // --- NEW: Monthly Results (Last 12 Months) ---
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyPurchases = await Purchase.find({
      ...purchaseQuery,
      status: "completed",
      createdAt: { $gte: twelveMonthsAgo },
    }).select("createdAt amount");

    const monthlyStudents = await User.find({
      role: "student",
      createdAt: { $gte: twelveMonthsAgo },
    }).select("createdAt");

    const monthlyMap = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyMap[key] = { name: key, revenue: 0, students: 0 };
    }

    monthlyPurchases.forEach((p) => {
      const key = new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (monthlyMap[key]) monthlyMap[key].revenue += p.amount;
    });

    monthlyStudents.forEach((s) => {
      const key = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (monthlyMap[key]) monthlyMap[key].students += 1;
    });

    const monthlyData = Object.values(monthlyMap);

    // --- NEW: Additional Metrics ---
    const totalUnenrollments = await Purchase.countDocuments({
      ...purchaseQuery,
      status: "unenrolled",
    });
    const avgOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

    // --- REFINED: Top 10 Course Stats ---
    const topCourseStats = courseStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalSales,
        avgOrderValue,
        totalUnenrollments,
        courseStats: topCourseStats,
        totalStudents,
        activeCourses,
        completionRate,
        engagementData: trendData, // Backward compatible name
        revenueTrend: trendData,
        monthlyData,
        recentActivity,
        categoryEnrollment,
        adminStats,
        recentReviews,
        recentContacts,
      },
    });
  } catch (error) {
    console.error("Stats Error:", error);
    return sendError(res, error, "getDashboardStats");
  }
};

/**
 * POST /api/v1/purchase/unenroll/:courseId
 * Soft-delete unenroll: marks the purchase as 'unenrolled' to preserve payment history.
 */
export const unenrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // 1. Remove course from User's enrolledCourses
    await User.findByIdAndUpdate(userId, {
      $pull: { enrolledCourses: courseId },
    });

    // 2. Remove user from Course's enrolledStudents
    await Course.findByIdAndUpdate(courseId, {
      $pull: { enrolledStudents: userId },
    });

    // 3. Soft-delete: Mark purchase as 'unenrolled' (preserves payment history)
    await Purchase.findOneAndUpdate(
      { userId, courseId, status: "completed" },
      {
        status: "unenrolled",
        unenrolledAt: new Date(),
      }
    );

    // 4. Delete CourseProgress (reset progress data)
    await CourseProgress.findOneAndDelete({ userId, courseId });

    return res.status(200).json({
      success: true,
      message: "Successfully unenrolled from the course.",
    });
  } catch (error) {
    console.error("Unenroll Error:", error);
    return sendError(res, error, "unenrollCourse");
  }
};
