import express from "express";
import {
  createCheckoutSession,
  verifyCheckoutSession,
  stripeWebhook,
  getDashboardStats,
  unenrollCourse,
} from "../Controller/purchase.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = express.Router();

router.route("/checkout").post(authenticate, createCheckoutSession);
router.route("/verify-session").post(authenticate, verifyCheckoutSession);
router.route("/webhook").post(stripeWebhook);
router
  .route("/stats")
  .get(authenticate, authorize("admin", "teacher"), getDashboardStats);

// Student unenrollment
router.route("/unenroll/:courseId").post(authenticate, unenrollCourse);

export default router;
