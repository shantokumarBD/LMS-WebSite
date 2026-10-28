import mongoose from "mongoose";
import CourseProgress from "../models/courseProgress.model.js";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Quiz from "../models/quiz.model.js";
import QuizAttempt from "../models/quizAttempt.model.js";
import Points from "../models/points.model.js";
import Purchase from "../models/purchase.model.js";
import { createNotification } from "./notification.controller.js";
import { sendCourseCompletionEmail } from "../utils/email.js";
import { sendError } from "../utils/errorHandler.js";

// 1. Get User Course Progress
export const getUserCourseProgress = async (req, res) => {
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

    const userObjectId = user?._id || userId;

    // Check enrollment via User model OR Purchase record
    const isEnrolledInUser = user?.enrolledCourses?.some(
      (id) => id.toString() === courseId,
    );

    const purchase = await Purchase.findOne({
      $or: [
        { userId: userObjectId, courseId, status: "completed" },
        { userId, courseId, status: "completed" },
      ],
    });

    if (!purchase && !isEnrolledInUser) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not enrolled in this course.",
      });
    }

    // Expiry check
    if (purchase?.expiryDate && new Date() > purchase.expiryDate) {
      return res.status(403).json({
        success: false,
        message:
          "Access expired. Your enrollment duration for this course has ended.",
        isExpired: true,
      });
    }

    // 1. Find enrollment (Purchase) date
    const enrollmentDate = purchase
      ? purchase.createdAt
      : user?.createdAt || new Date(0);

    // 2. Find progress entry
    let progress = await CourseProgress.findOne({
      $or: [
        { userId: userObjectId, courseId },
        { userId, courseId },
      ],
    });
    if (!progress) {
      progress = { completedLectures: [], isCompleted: false };
    }

    // 3. Fetch course lectures to calculate drip status
    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const now = new Date();
    // Day difference helper
    const getDaysSince = (date) =>
      Math.floor((now - new Date(date)) / (1000 * 60 * 60 * 24));
    const daysSinceEnrollment = getDaysSince(enrollmentDate);

    // Filter/Tag lectures for frontend
    const enrichedLectures = (course.lectures || []).map((lecture) => {
      const isLocked = daysSinceEnrollment < (lecture.releaseOffset || 0);
      return {
        ...lecture.toObject(),
        isDripLocked: isLocked,
        availableIn: Math.max(
          0,
          (lecture.releaseOffset || 0) - daysSinceEnrollment,
        ),
      };
    });

    return res.status(200).json({
      success: true,
      progress,
      enrollmentDate,
      lectures: enrichedLectures,
    });
  } catch (error) {
    return sendError(res, error, "courseProgressController");
  }
};

// 2. Update Lecture Completion
export const updateLectureProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.user.id;

    // BUG-004 FIX: Verify purchase/enrollment integrity
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    const userObjectId = user?._id || userId;
    const isEnrolled = user?.enrolledCourses?.some(
      (id) => id.toString() === courseId,
    );
    const purchase = await Purchase.findOne({
      $or: [
        { userId: userObjectId, courseId, status: "completed" },
        { userId, courseId, status: "completed" },
      ],
    });

    if (!purchase && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to track progress.",
      });
    }

    // Find or Create Progress
    let progress = await CourseProgress.findOne({ userId, courseId });

    if (!progress) {
      progress = await CourseProgress.create({
        userId,
        courseId,
        completedLectures: [],
        rewardedLectures: [], // Added for BUG-018
      });
    }

    // Toggle lecture completion
    const index = progress.completedLectures.indexOf(lectureId);
    let messageStr = "";

    if (index === -1) {
      // Mark as completed
      progress.completedLectures.push(lectureId);
      messageStr = "Lecture marked as completed.";
      
      // BUG-018 FIX: Only reward points once per lecture
      if (!progress.rewardedLectures.includes(lectureId)) {
        progress.rewardedLectures.push(lectureId);
        await Points.findOneAndUpdate(
          { userId },
          { 
            $inc: { totalPoints: 10 }, 
            $push: { history: { points: 10, reason: "Completed a lecture" } } 
          },
          { upsert: true }
        );
      }
    } else {
      // Unmark as completed
      progress.completedLectures.splice(index, 1);
      messageStr = "Lecture unmarked.";
      
      // BUG-011 FIX: Deduct points ONLY if user has enough points
      // BUG-018 FIX: If we deduct, we must remove it from rewardedLectures so they can earn it back if they re-complete
      const userPoints = await Points.findOne({ userId });
      if (userPoints && userPoints.totalPoints >= 10 && progress.rewardedLectures.includes(lectureId)) {
        progress.rewardedLectures = progress.rewardedLectures.filter(id => id.toString() !== lectureId.toString());
        await Points.findOneAndUpdate(
          { userId },
          { 
            $inc: { totalPoints: -10 }, 
            $push: { history: { points: -10, reason: "Unmarked a lecture completion" } } 
          }
        );
      }
    }

    // Check if course is fully completed (Lectures + Quizzes)
    if (course) {
      const totalLectures = course.lectures.length;
      const allLecturesDone = progress.completedLectures.length === totalLectures;

      // Check if all quizzes for this course are passed
      const quizzes = await Quiz.find({ courseId });
      let allQuizzesPassed = true;

      if (quizzes.length > 0) {
        const quizIds = quizzes.map((q) => q._id);
        const passedAttempts = await QuizAttempt.countDocuments({
          userId,
          quizId: { $in: quizIds },
          isPassed: true,
        });
        
        // We need to ensure each unique quiz is passed
        // A more robust way:
        const userPassedQuizzes = await QuizAttempt.distinct("quizId", {
            userId,
            quizId: { $in: quizIds },
            isPassed: true
        });

        allQuizzesPassed = userPassedQuizzes.length === quizzes.length;
      }

      progress.isCompleted = allLecturesDone && allQuizzesPassed;
      
      if (progress.isCompleted && !progress.completionBonusAwarded) {
        // 1. Award 100 bonus points (one-time)
        await Points.findOneAndUpdate(
          { userId },
          {
            $inc: { totalPoints: 100 },
            $push: { history: { points: 100, reason: `Completed course: "${course.courseTitle}"` } },
          },
          { upsert: true }
        );
        progress.completionBonusAwarded = true;

        // 2. Create in-app notification
        await createNotification(
          userId,
          "Course Completed! 🎉",
          `Congratulations! You completed "${course.courseTitle}" and earned 100 bonus points!`,
          "success",
          `/certificate/${courseId}`
        );

        // 3. Send professional completion email
        const certUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/certificate/${courseId}`;
        sendCourseCompletionEmail(user.email, user.name, course.courseTitle, certUrl).catch(err => 
          console.error("Completion email failed:", err.message)
        );
      }
    }

    await progress.save();

    return res.status(200).json({
      success: true,
      message: messageStr,
      progress,
    });
  } catch (error) {
    return sendError(res, error, "courseProgressController");
  }
};

// 3. Reset Course Progress
export const resetCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // BUG-004 FIX: Verify purchase/enrollment integrity
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (course.price > 0) {
      // For paid courses, ensure there's a completed purchase
      const purchase = await Purchase.findOne({ userId, courseId, status: "completed" });
      if (!purchase) {
        return res.status(403).json({ success: false, message: "You must purchase this course to track progress." });
      }
    } else {
      // For free courses, rely on enrolledCourses
      if (!user.enrolledCourses.includes(courseId)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. You are not enrolled in this course.",
        });
      }
    }

    const progress = await CourseProgress.findOne({ userId, courseId });
    if (progress) {
      progress.completedLectures = [];
      progress.isCompleted = false;
      await progress.save();
    }

    return res.status(200).json({
      success: true,
      message: "Progress reset successfully",
    });
  } catch (error) {
    return sendError(res, error, "courseProgressController");
  }
};
