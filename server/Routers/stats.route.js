import express from "express";
import { getPlatformStats } from "../Controller/stats.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Platform stats for landing page StatsSection (Students, Courses, Tutors, Success rate)
router.get("/", getPlatformStats);

export default router;
