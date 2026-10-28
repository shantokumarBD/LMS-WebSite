import mongoose from "mongoose";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import Review from "../models/review.model.js";
import CourseProgress from "../models/courseProgress.model.js";
import Purchase from "../models/purchase.model.js";
import QuizAttempt from "../models/quizAttempt.model.js";
import Points from "../models/points.model.js";
import Notification from "../models/notification.model.js";
import Certificate from "../models/certificate.model.js";
import Cart from "../models/cart.model.js";
import QA from "../models/qa.model.js";
import ForumPost from "../models/forumPost.model.js";
import ForumComment from "../models/forumComment.model.js";
import BlogComment from "../models/blogComment.model.js";
import Notes from "../models/notes.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
} from "../utils/email.js";
import { sendError } from "../utils/errorHandler.js";
import { getStripe } from "./purchase.controller.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // BUG-012 FIX: Check if user already exists BEFORE hashing the password.
    // Hashing is CPU-intensive. Doing it before checking for duplicates allows DoS attacks.
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: `Account already exists with this email as a ${user.role}. One email can only have one role.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin registration is not allowed. Please contact support.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Generate email verification token (24h expiry)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    newUser.emailVerifyToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");
    newUser.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await newUser.save();

    // Build the verify URL
    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verifyToken}`;

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verifyUrl).catch((err) =>
      console.error("Verification email failed:", err.message),
    );

    return res.status(201).json({
      success: true,
      message:
        "Account created! Please check your email to verify your account.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: false,
      },
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Incorrect email or password" });
    }

    // Role check removed. Users can log in using just email and password.
    // This allows hiding the Admin role from the frontend UI securely.

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect email or password" });
    }

    // Block banned users
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support.",
      });
    }

    // Block unverified users
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
        email: user.email,
      });
    }

    // token generation
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "48h",
      },
    );

    // set cookie
    return res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only HTTPS in production
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 48 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.profilePicture
            ? user.profilePicture.startsWith("http")
              ? user.profilePicture
              : `${process.env.BACKEND_URL || "http://localhost:4000"}/${user.profilePicture}`
            : null,
          enrolledCourses: user.enrolledCourses || [],
        },
      });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    let user = null;
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      user = await User.findById(req.user.id).select("-password");
    } else if (req.user.email) {
      user = await User.findOne({ email: req.user.email }).select("-password");
    }

    if (!user) {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          name: req.user.name || "User",
          email: req.user.email || "",
          role: req.user.role || "student",
          bio: "",
          socialLinks: {},
          photoUrl: null,
          enrolledCourses: [],
        },
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        socialLinks: user.socialLinks,
        photoUrl: user.profilePicture
          ? user.profilePicture.startsWith("http")
            ? user.profilePicture
            : `${process.env.BACKEND_URL || "http://localhost:4000"}/${user.profilePicture}`
          : null,
        enrolledCourses: user.enrolledCourses || [],
      },
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

export const logoutUser = async (req, res) => {
  try {
    return res
      .status(200)
      .clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      })
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, socialLinks } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use by another account",
      });
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      bio: bio || "",
    };

    // Handle socialLinks (partial update — only update keys that are provided)
    let parsedSocialLinks = socialLinks;
    if (typeof socialLinks === "string") {
      try { parsedSocialLinks = JSON.parse(socialLinks); } catch { parsedSocialLinks = null; }
    }
    if (parsedSocialLinks && typeof parsedSocialLinks === "object") {
      updateData["socialLinks.linkedin"] = parsedSocialLinks.linkedin || "";
      updateData["socialLinks.twitter"] = parsedSocialLinks.twitter || "";
      updateData["socialLinks.github"] = parsedSocialLinks.github || "";
      updateData["socialLinks.website"] = parsedSocialLinks.website || "";
    }

    // If profile picture is uploaded, add it to update data
    if (req.file) {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file.path);

      if (uploadResult.success) {
        updateData.profilePicture = uploadResult.url;

        // Remove file from local storage after successful upload
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error deleting local file:", err);
        }
      } else {
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload image" });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        bio: updatedUser.bio,
        socialLinks: updatedUser.socialLinks,
        photoUrl: updatedUser.profilePicture
          ? updatedUser.profilePicture.startsWith("http")
            ? updatedUser.profilePicture
            : `${process.env.BACKEND_URL || "http://localhost:4000"}/${updatedUser.profilePicture}`
          : null,
      },
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Get user's enrolled courses
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Auto-sync / Auto-heal from Stripe:
    // Check if user has any pending or completed purchases and sync with enrolledCourses
    try {
      const purchases = await Purchase.find({
        userId: user._id,
        status: { $in: ["pending", "completed"] },
      });

      if (purchases.length > 0) {
        const stripe = getStripe();
        let updated = false;

        for (const purchase of purchases) {
          // If pending, check with Stripe whether session was paid
          if (
            purchase.status === "pending" &&
            purchase.paymentId &&
            purchase.paymentId.startsWith("cs_")
          ) {
            try {
              const session = await stripe.checkout.sessions.retrieve(
                purchase.paymentId,
              );
              if (session && session.payment_status === "paid") {
                purchase.status = "completed";
                await purchase.save();
                updated = true;
              }
            } catch (stripeErr) {
              console.warn("Stripe session check warning:", stripeErr.message);
            }
          }

          // Ensure any completed purchase is reflected in user.enrolledCourses
          if (purchase.status === "completed") {
            const cId = purchase.courseId.toString();
            if (
              !user.enrolledCourses.some((id) => id.toString() === cId)
            ) {
              user.enrolledCourses.push(purchase.courseId);
              updated = true;
            }
            await Course.findByIdAndUpdate(purchase.courseId, {
              $addToSet: { enrolledStudents: user._id },
            });
          }
        }

        if (updated) {
          await user.save();
        }
      }
    } catch (syncErr) {
      console.warn("Purchase auto-sync warning:", syncErr.message);
    }

    // Populate user's enrolled courses
    await user.populate({
      path: "enrolledCourses",
      populate: {
        path: "creator",
        select: "_id name profilePicture bio description role",
      },
    });

    // Fetch progress for all enrolled courses
    const progress = await CourseProgress.find({
      $or: [{ userId: user._id }, { userId: req.user.id }],
    });

    return res.status(200).json({
      success: true,
      courses: user.enrolledCourses || [],
      progress: progress || [],
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Get user's wishlist
export const getWishlistCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "wishlist",
      populate: { path: "creator", select: "_id name profilePicture bio description role" },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      courses: user.wishlist,
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Public: get instructor profile
export const getInstructorProfile = async (req, res) => {
  try {
    const { instructorId } = req.params;

    const instructor = await User.findById(instructorId).select(
      "-password -enrolledCourses -wishlist",
    );
    if (!instructor || !["teacher", "admin"].includes(instructor.role)) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    // Get all published courses by this instructor
    const courses = await Course.find({
      creator: instructorId,
      isPublished: true,
    })
      .populate("lectures", "lectureTitle")
      .select(
        "courseTitle courseThumbnail category price enrolledStudents lectures",
      );

    // Total students across all courses
    const totalStudents = courses.reduce(
      (sum, c) => sum + (c.enrolledStudents?.length || 0),
      0,
    );

    // Average rating across all courses
    const courseIds = courses.map((c) => c._id);
    const reviews = await Review.find({ courseId: { $in: courseIds } });
    const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating =
      reviews.length > 0
        ? parseFloat((totalRatings / reviews.length).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        bio: instructor.bio,
        description: instructor.description,
        profilePicture: instructor.profilePicture,
        socialLinks: instructor.socialLinks,
        totalCourses: courses.length,
        totalStudents,
        averageRating,
        totalReviews: reviews.length,
      },
      courses,
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Password Reset — Request Link
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Return 200 to prevent user enumeration (don't reveal if email exists)
      return res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate random token
    // BUG-028 FIX: Use 32 bytes for consistency and stronger security
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.name, resetUrl);
    } catch (emailErr) {
      // Rollback token if email fails so user can try again
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error("Password reset email failed:", emailErr.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later.",
      });
    }

    return res.json({
      success: true,
      message: "Password reset link has been sent to your email address.",
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Password Reset — Finalize
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate minimum password length
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Admin: Get all users (paginated + searchable)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", role = "" } = req.query;
    const query = {};
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { email: regex }];
    }
    if (role) query.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Admin: Toggle ban/unban user
export const toggleBanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from banning themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban your own account.",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Don't allow banning other admins
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot ban an admin account.",
      });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    return res.status(200).json({
      success: true,
      message: user.isBanned
        ? `User "${user.name}" has been banned.`
        : `User "${user.name}" has been unbanned.`,
      user,
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Admin: Change user role
export const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be student, teacher, or admin.",
      });
    }

    // Prevent self-demotion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Role updated to "${role}" for ${user.name}.`,
      user,
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// Admin: Delete user (with cascade cleanup)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prevent deleting other admins
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot delete an admin account.",
      });
    }

    // BUG-NEW-H FIX: Prevent deleting a teacher if they have created courses.
    // If a teacher with courses is deleted, their courses become orphaned (creator = null).
    // The admin must reassign or delete the courses first.
    if (user.role === "teacher") {
      const coursesCount = await Course.countDocuments({ creator: userId });
      if (coursesCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete this teacher because they have ${coursesCount} courses. Please reassign or delete their courses first.`,
        });
      }
    }

    // Cascade: clean up all user-owned documents
    // BUG-NEW-G FIX: Added missing models to the cascade delete list.
    // Previously Cart, QA, Notes, ForumPost, ForumComment, and BlogComment were left orphaned.
    await Promise.all([
      Purchase.deleteMany({ userId }),
      CourseProgress.deleteMany({ userId }),
      Review.deleteMany({ userId }),
      QuizAttempt.deleteMany({ userId }),
      Points.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      Certificate.deleteMany({ userId }),
      Cart.deleteMany({ userId }),
      QA.deleteMany({ userId }),
      Notes.deleteMany({ userId }),
      ForumPost.deleteMany({ userId }),
      ForumComment.deleteMany({ userId }),
      BlogComment.deleteMany({ userId }),
    ]);

    // Remove user from enrolled courses and wishlists
    await Course.updateMany(
      { $or: [{ enrolledStudents: userId }, { wishlist: userId }] },
      { $pull: { enrolledStudents: userId, wishlist: userId } },
    );

    // If the user had any QA replies (but didn't create the QA), pull their replies
    await QA.updateMany(
      { "replies.userId": userId },
      { $pull: { replies: { userId } } }
    );

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: `User "${user.name}" and all related data have been deleted.`,
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// ─────────────────────────────────────────────
// Email Verification
// ─────────────────────────────────────────────

// GET /api/v1/users/verify-email?token=...
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is missing.",
      });
    }

    // Hash the raw token to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Verification link is invalid or has expired. Please request a new one.",
      });
    }

    // Mark as verified and clear token
    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    // Generate JWT token for auto-login
    const tokenPayload = { id: user._id, role: user.role };
    const authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "48h",
    });

    // Send welcome email now that they're verified
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("Welcome email failed:", err.message),
    );

    return res
      .status(200)
      .cookie("token", authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 48 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message: "Email verified successfully! You are now logged in.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.profilePicture
            ? user.profilePicture.startsWith("http")
              ? user.profilePicture
              : `${process.env.BACKEND_URL || "http://localhost:4000"}/${user.profilePicture}`
            : null,
          enrolledCourses: user.enrolledCourses || [],
        },
      });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// POST /api/v1/users/resend-verification
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists and is unverified, a new link has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This account is already verified.",
      });
    }

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    user.emailVerifyToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verifyToken}`;

    sendVerificationEmail(user.email, user.name, verifyUrl).catch((err) =>
      console.error("Resend verification email failed:", err.message),
    );

    return res.status(200).json({
      success: true,
      message:
        "A new verification link has been sent. Please check your inbox.",
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};

// POST /api/v1/users/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return sendError(res, error, "userController");
  }
};
