import mongoose from "mongoose";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Lecture from "../models/lecture.model.js";
import Quiz from "../models/quiz.model.js";
import QuizAttempt from "../models/quizAttempt.model.js";
import CourseProgress from "../models/courseProgress.model.js";
import Review from "../models/review.model.js";
import Purchase from "../models/purchase.model.js";
import Certificate from "../models/certificate.model.js";
import QA from "../models/qa.model.js";
import ForumPost from "../models/forumPost.model.js";
import ForumComment from "../models/forumComment.model.js";
import Notes from "../models/notes.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { sendError } from "../utils/errorHandler.js";

// Create a new course with title, category, and the logged-in user as creator
export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;

    // Validate required fields
    if (!courseTitle || !category) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Create course and assign the authenticated user as the creator
    const course = await Course.create({
      courseTitle,
      category,
      creator: req.user.id,
    });
    return res
      .status(201)
      .json({ success: true, course, message: "Course created successfully" });
  } catch (error) {
    return sendError(res, error, "createCourse");
  }
};

// Get all published courses (publicly accessible, no auth required)
export const getPublicCourses = async (req, res) => {
  try {
    // Only fetch courses where isPublished is true
    const courses = await Course.find({ isPublished: true });
    if (!courses || courses.length === 0) {
      return res
        .status(200)
        .json({ success: true, courses: [], message: "No courses found" });
    }
    return res.status(200).json({
      success: true,
      courses,
      message: "Courses fetched successfully",
    });
  } catch (error) {
    return sendError(res, error, "getPublicCourses");
  }
};

// Get all courses created by the logged-in user (requires authentication)
export const getCreatorCourses = async (req, res) => {
  try {
    // Get the authenticated user's ID from the request
    const userId = req.user.id;

    // Find all courses where the creator matches the logged-in user
    const courses = await Course.find({ creator: userId });
    if (!courses || courses.length === 0) {
      return res.status(200).json({
        success: true,
        courses: [],
        message: "No courses found",
      });
    }
    return res.status(200).json({
      success: true,
      courses,
      message: "Courses fetched successfully",
    });
  } catch (error) {
    return sendError(res, error, "getCreatorCourses");
  }
};

// edit course
export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      courseTitle,
      category,
      subTitle,
      description,
      courseLevel,
      price,
      discount,
      language,
      previewVideo,
      whatYouWillLearn,
      requirements,
    } = req.body;
    const file = req.file;

    // 1. Check if course exists and belongs to user
    let course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 2. Prepare Update Object
    const updateData = {};
    if (courseTitle !== undefined) updateData.courseTitle = courseTitle;
    if (category !== undefined) updateData.category = category;
    if (subTitle !== undefined) updateData.subTitle = subTitle;
    if (description !== undefined) updateData.description = description;
    if (courseLevel !== undefined) updateData.courseLevel = courseLevel;
    // BUG-010 FIX: Move validations BEFORE file upload to prevent orphaned files in Cloudinary
    if (price !== undefined) {
      if (Number(price) < 0) {
        return res.status(400).json({ success: false, message: "Price cannot be negative" });
      }
      updateData.price = Number(price);
    }
    if (discount !== undefined) {
      updateData.discount = Math.min(100, Math.max(0, Number(discount)));
    }
    if (language !== undefined) updateData.language = language;
    if (previewVideo !== undefined) updateData.previewVideo = previewVideo;
    // Handle array fields sent as JSON strings or actual arrays
    if (whatYouWillLearn !== undefined) {
      updateData.whatYouWillLearn =
        typeof whatYouWillLearn === "string"
          ? JSON.parse(whatYouWillLearn)
          : whatYouWillLearn;
    }
    if (requirements !== undefined) {
      updateData.requirements =
        typeof requirements === "string"
          ? JSON.parse(requirements)
          : requirements;
    }

    // 3. Upload Thumbnail if exists
    if (file) {
      // Delete old thumbnail if it exists
      if (course.courseThumbnailPublicId) {
        await deleteFromCloudinary(course.courseThumbnailPublicId);
      }
      
      const result = await uploadToCloudinary(file.path, "lms/courses");
      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload thumbnail" });
      }
      updateData.courseThumbnail = result.url;
      updateData.courseThumbnailPublicId = result.public_id;
    }

    // 4. Update Course
    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      course: updatedCourse,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// get course by id
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("lectures")
      .populate("creator", "_id name profilePicture bio description role");

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // BUG-017 FIX: Hide draft/unpublished courses from non-owners and non-admins.
    // Previously any user could fetch a draft course by its ID (information leak).
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const isOwner = course.creator?._id?.toString() === requesterId;
    const isAdmin = requesterRole === "admin";

    if (!course.isPublished && !isOwner && !isAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    return res
      .status(200)
      .json({ success: true, course, message: "Course fetched successfully" });
  } catch (error) {
    return sendError(res, error, "getCourseById");
  }
};

// delete course (with full cascade cleanup)
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Admin can delete any course; creator can delete their own
    if (
      req.user.role !== "admin" &&
      course.creator.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 1. Delete all lecture videos from Cloudinary
    const lectures = await Lecture.find({ course: courseId });
    for (const lecture of lectures) {
      if (lecture.publicId) {
        await deleteFromCloudinary(lecture.publicId);
      }
    }

    // 2. Delete Course Thumbnail from Cloudinary
    if (course.courseThumbnailPublicId) {
      await deleteFromCloudinary(course.courseThumbnailPublicId);
    }

    // 2. Delete all lectures
    await Lecture.deleteMany({ course: courseId });

    // 3. Delete all quizzes and their attempts
    const quizzes = await Quiz.find({ courseId });
    const quizIds = quizzes.map((q) => q._id);
    await QuizAttempt.deleteMany({ quizId: { $in: quizIds } });
    await Quiz.deleteMany({ courseId });

    // 4. Delete course progress records
    await CourseProgress.deleteMany({ courseId });

    // 5. Delete reviews
    await Review.deleteMany({ courseId });

    // 6. Delete purchases
    await Purchase.deleteMany({ courseId });

    // 7. Delete certificates
    await Certificate.deleteMany({ courseId });

    // BUG-NEW-F FIX: Delete QA, Notes, and Forum data associated with the course
    // Previously these were left orphaned in the database.
    await QA.deleteMany({ courseId });
    await Notes.deleteMany({ courseId });
    
    // Delete Forum Posts and their associated comments
    const forumPosts = await ForumPost.find({ courseId });
    if (forumPosts.length > 0) {
      const postIds = forumPosts.map((p) => p._id);
      await ForumComment.deleteMany({ postId: { $in: postIds } });
      await ForumPost.deleteMany({ courseId });
    }

    // 8. Remove course from all users' enrolledCourses and wishlists
    await User.updateMany(
      { $or: [{ enrolledCourses: courseId }, { wishlist: courseId }] },
      { $pull: { enrolledCourses: courseId, wishlist: courseId } },
    );

    // 9. Delete the course itself
    await Course.findByIdAndDelete(courseId);

    return res
      .status(200)
      .json({ success: true, message: "Course and all related data deleted successfully" });
  } catch (error) {
    return sendError(res, error, "deleteCourse");
  }
};

// create lecture

export const createLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lectureTitle } = req.body;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Lecture title is required",
      });
    }

    // 1. Check if course exists first
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // BUG-003 FIX: Ownership check — only course creator or admin can add lectures.
    // Previously ANY teacher could add lectures to ANY course (IDOR vulnerability).
    if (course.creator.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only add lectures to your own courses.",
      });
    }

    // 2. Create Lecture
    const lecture = await Lecture.create({
      lectureTitle,
      sectionName: req.body.sectionName || "Course Content",
      course: courseId,
    });

    // 3. Update Course
    course.lectures.push(lecture._id);
    await course.save();

    return res.status(201).json({
      success: true,
      lecture,
      course,
      message: "Lecture created successfully",
    });
  } catch (error) {
    return sendError(res, error, "createLecture");
  }
};

// get course lectures
export const getCourseLectures = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    return res
      .status(200)
      .json({ success: true, course, message: "Course fetched successfully" });
  } catch (error) {
    return sendError(res, error, "getCourseLectures");
  }
};

// edit lecture
export const editLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const { lectureTitle, videoUrl, isPreviewFree, sectionName } = req.body;
    const file = req.file;

    // BUG-003 FIX: Verify course ownership BEFORE allowing lecture edits.
    // Previously there was no ownership check — any teacher could edit any lecture.
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (course.creator.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only edit lectures in your own courses.",
      });
    }

    // 1. Check if lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    // 2. Update Basic Fields
    if (lectureTitle !== undefined) lecture.lectureTitle = lectureTitle;
    if (sectionName !== undefined) lecture.sectionName = sectionName;
    if (isPreviewFree !== undefined) {
      lecture.isPreviewFree =
        isPreviewFree === "true" || isPreviewFree === true;
    }

    // Handle video upload or YouTube URL
    if (file) {
      // 1. Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.path, "lms/lectures");
      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload video" });
      }

      // 2. Delete old video if exists
      if (lecture.publicId) {
        await deleteFromCloudinary(lecture.publicId);
      }

      // 3. Update lecture with new video
      lecture.videoUrl = result.url;
      lecture.publicId = result.publicId;
    } else if (videoUrl && !videoUrl.includes("res.cloudinary.com")) {
      // Handle YouTube URL (only if it's not a Cloudinary URL)
      // If switching to YouTube, delete old Cloudinary video
      if (lecture.publicId) {
        await deleteFromCloudinary(lecture.publicId);
      }
      lecture.videoUrl = videoUrl;
      lecture.publicId = null; // Clear publicId for YouTube
    }

    await lecture.save();

    // BUG-NEW-A FIX: Remove duplicate course fetch — course was already fetched at the top of editLecture for ownership check.
    // Ensure lecture is linked to the course using the already-fetched `course` variable.
    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(200).json({
      success: true,
      lecture,
      message: "Lecture updated successfully",
    });
  } catch (error) {
    return sendError(res, error, "editLecture");
  }
};

// delete lecture
export const deleteLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    // BUG-003 FIX: Verify course ownership before allowing lecture deletion.
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (course.creator.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete lectures from your own courses.",
      });
    }

    // 1. Find lecture
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // 2. Delete video from Cloudinary if exists
    if (lecture.publicId) {
      await deleteFromCloudinary(lecture.publicId);
    }

    // 3. Remove lecture from course
    await Course.findByIdAndUpdate(courseId, {
      $pull: { lectures: lectureId },
    });

    // 4. Delete lecture document
    await Lecture.findByIdAndDelete(lectureId);

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully",
    });
  } catch (error) {
    return sendError(res, error, "deleteLecture");
  }
};

// toggle publish course
export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // 1. Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // 2. Ownership Check: Only the creator can publish/unpublish
    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only the creator can publish this course",
      });
    }

    // 3. Validation when publishing (not when unpublishing)
    if (!course.isPublished) {
      const missing = [];
      if (!course.courseTitle?.trim()) missing.push("Course title");
      if (!course.subTitle?.trim()) missing.push("Subtitle");
      if (!course.description?.trim()) missing.push("Description");
      if (!course.courseThumbnail) missing.push("Thumbnail image");
      if (course.price === undefined || course.price === null)
        missing.push("Price (can be 0 for free)");
      if (!course.lectures || course.lectures.length === 0)
        missing.push("At least one lecture");

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Please complete the following before publishing: ${missing.join(", ")}.`,
          missingFields: missing,
        });
      }
    }

    // 4. Toggle publish status and sync 'status' field
    course.isPublished = !course.isPublished;
    course.status = course.isPublished ? "Published" : "Draft";

    await course.save();

    const message = course.isPublished
      ? "Course published successfully"
      : "Course unpublished successfully";

    return res.status(200).json({
      success: true,
      course,
      message,
    });
  } catch (error) {
    return sendError(res, error, "publishCourse");
  }
}; // get published courses with search, filters, and pagination
export const getPublishedCourses = async (req, res) => {
  try {
    const {
      search = "",
      categories = [],
      levels = [],
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    // 1. Build Query
    const query = { isPublished: true };

    // Text Search (Title, Subtitle, Category)
    if (search) {
      const escapedSearch = search
        .trim()
        .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      query.$or = [
        { courseTitle: searchRegex },
        { subTitle: searchRegex },
        { category: searchRegex },
      ];
    }

    // Category Filter
    if (categories.length > 0) {
      query.category = {
        $in: Array.isArray(categories) ? categories : [categories],
      };
    }

    // Level Filter
    if (levels.length > 0) {
      query.courseLevel = { $in: Array.isArray(levels) ? levels : [levels] };
    }

    // Price Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    // 2. Build Sort Options (standard sort for simple cases)
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === "price-low") sortOptions = { price: 1 };
    if (sort === "price-high") sortOptions = { price: -1 };
    if (sort === "oldest") sortOptions = { createdAt: 1 };

    // 3. Pagination Logic
    const skip = (Number(page) - 1) * Number(limit);

    // 4. Execute Query
    // For most-popular and top-rated, use aggregation pipeline to sort by computed field
    if (sort === "most-popular" || sort === "top-rated") {
      const aggregation = [
        { $match: query },
        {
          $addFields: {
            enrolledCount: { $size: { $ifNull: ["$enrolledStudents", []] } },
          },
        },
        { $sort: sort === "most-popular" ? { enrolledCount: -1 } : { averageRating: -1, enrolledCount: -1 } },
        {
          $facet: {
            courses: [
              { $skip: skip },
              { $limit: Number(limit) },
              {
                $lookup: {
                  from: "lectures",
                  localField: "lectures",
                  foreignField: "_id",
                  as: "lectures",
                  pipeline: [{ $project: { lectureTitle: 1 } }],
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "creator",
                  foreignField: "_id",
                  as: "creator",
                  pipeline: [{ $project: { _id: 1, name: 1, profilePicture: 1, bio: 1, description: 1, role: 1 } }],
                },
              },
              { $unwind: { path: "$creator", preserveNullAndEmpty: true } },
            ],
            total: [{ $count: "count" }],
          },
        },
      ];

      const [result] = await Course.aggregate(aggregation);
      const courses = result?.courses || [];
      const totalCourses = result?.total?.[0]?.count || 0;

      return res.status(200).json({
        success: true,
        courses,
        totalCourses,
        totalPages: Math.ceil(totalCourses / Number(limit)),
        currentPage: Number(page),
        message: "Published courses fetched successfully",
      });
    }

    const [courses, totalCourses] = await Promise.all([
      Course.find(query)
        .populate("lectures", "lectureTitle")
        .populate("creator", "_id name profilePicture bio description role")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Course.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      courses,
      totalCourses,
      totalPages: Math.ceil(totalCourses / Number(limit)),
      currentPage: Number(page),
      message: "Published courses fetched successfully",
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return sendError(res, error, "searchCourses");
  }
};

// Enroll in a course
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // BUG-005 FIX: Block free enrollment on paid courses.
    // Previously any authenticated user could call this endpoint and enroll
    // in a paid course for free, bypassing the Stripe payment flow entirely.
    if (course.price > 0) {
      return res.status(403).json({
        success: false,
        message:
          "This is a paid course. Please complete the purchase to enroll.",
      });
    }

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

    if (user.enrolledCourses?.some((id) => id.toString() === courseId)) {
      return res
        .status(400)
        .json({ success: false, message: "Already enrolled in this course" });
    }

    // Add course to user's enrolledCourses
    user.enrolledCourses.push(courseId);
    await user.save();

    // Add user to course's enrolledStudents
    course.enrolledStudents.push(user._id);
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Enrolled successfully",
    });
  } catch (error) {
    return sendError(res, error, "enrollCourse");
  }
};

// Toggle Wishlist
export const toggleWishlist = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const isWishlisted = user.wishlist.some((id) => id.toString() === courseId);

    if (isWishlisted) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== courseId);
    } else {
      user.wishlist.push(courseId);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      isWishlisted: !isWishlisted,
      message: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
    });
  } catch (error) {
    return sendError(res, error, "toggleWishlist");
  }
};

// Check Enrollment and Wishlist Status
export const checkEnrollmentAndWishlist = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        isEnrolled: false,
        isWishlisted: false,
        progress: null,
      });
    }

    const isEnrolled =
      user.enrolledCourses?.some((id) => id.toString() === courseId) || false;
    const isWishlisted =
      user.wishlist?.some((id) => id.toString() === courseId) || false;

    const progress = await CourseProgress.findOne({
      userId: user._id,
      courseId,
    });

    return res.status(200).json({
      success: true,
      isEnrolled,
      isWishlisted,
      progress,
    });
  } catch (error) {
    return sendError(res, error, "checkEnrollmentAndWishlist");
  }
};
// Rename a section (updates all lectures and quizzes in that section)
export const renameSection = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { oldSectionName, newSectionName } = req.body;

    if (!oldSectionName || !newSectionName) {
      return res.status(400).json({
        success: false,
        message: "Both old and new section names are required",
      });
    }

    // Update Lectures
    await Lecture.updateMany(
      { course: courseId, sectionName: oldSectionName },
      { $set: { sectionName: newSectionName } },
    );

    // Update Quizzes
    await Quiz.updateMany(
      { courseId, sectionName: oldSectionName },
      { $set: { sectionName: newSectionName } },
    );

    return res.status(200).json({
      success: true,
      message: `Section renamed from "${oldSectionName}" to "${newSectionName}"`,
    });
  } catch (error) {
    return sendError(res, error, "renameSection");
  }
};

// Delete a section (removes all lectures and quizzes in that section)
export const deleteSection = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { sectionName } = req.body;

    if (!sectionName) {
      return res
        .status(400)
        .json({ success: false, message: "Section name is required" });
    }

    // 1. Get all lectures to delete videos from Cloudinary
    const lecturesToDelete = await Lecture.find({
      course: courseId,
      sectionName,
    });
    for (const lecture of lecturesToDelete) {
      if (lecture.publicId) {
        await deleteFromCloudinary(lecture.publicId);
      }
    }

    // 2. Remove lectures from Course document
    const lectureIds = lecturesToDelete.map((l) => l._id);
    await Course.findByIdAndUpdate(courseId, {
      $pull: { lectures: { $in: lectureIds } },
    });

    // 3. Delete Lectures
    await Lecture.deleteMany({ course: courseId, sectionName });

    // 4. Delete Quizzes
    await Quiz.deleteMany({ courseId, sectionName });

    return res.status(200).json({
      success: true,
      message: `Section "${sectionName}" and its content deleted successfully`,
    });
  } catch (error) {
    return sendError(res, error, "deleteSection");
  }
};

// --- INSTRUCTOR STUDENT MANAGEMENT ---

export const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // 1. Authorization Check
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (course.creator.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 2. Fetch Students
    const enrolledStudents = await User.find({ _id: { $in: course.enrolledStudents } })
      .select("name email profilePicture enrolledCourses createdAt")
      .lean();

    // 3. Fetch progress for each student
    const totalLectures = course.lectures.length;
    const studentsWithProgress = await Promise.all(enrolledStudents.map(async (student) => {
      const progress = await CourseProgress.findOne({ userId: student._id, courseId });
      const completedCount = progress?.completedLectures?.length || 0;
      
      const purchase = await Purchase.findOne({ userId: student._id, courseId, status: "completed" });

      return {
        ...student,
        progress: totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0,
        enrolledAt: purchase ? purchase.createdAt : student.createdAt,
        expiryDate: purchase?.expiryDate || null,
        isCompleted: progress?.isCompleted || false
      };
    }));

    return res.status(200).json({
      success: true,
      students: studentsWithProgress,
      totalLectures
    });
  } catch (error) {
    return sendError(res, error, "getCourseStudents");
  }
};
