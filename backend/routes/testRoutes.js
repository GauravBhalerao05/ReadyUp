import express from "express";
import {
    getMockTests,
    getMockTestById,
    startPractice,
    startMockTest,
    submitAttempt,
    getAttemptReview,
    getHistory,
    getIncorrectQuestions,
    createMockTest,
} from "../controllers/testController.js";
import { protect, allowRoles, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/mock-tests", optionalAuth, getMockTests);
router.get("/mock-tests/:id", optionalAuth, getMockTestById);

// Student actions
router.post("/practice/start", protect, allowRoles("student"), startPractice);
router.post("/mock-tests/:id/start", protect, allowRoles("student"), startMockTest);
router.post("/attempts/:attemptId/submit", protect, allowRoles("student"), submitAttempt);
router.get("/attempts/:attemptId/review", protect, getAttemptReview);
router.get("/history", protect, allowRoles("student"), getHistory);
router.get("/incorrect", protect, allowRoles("student"), getIncorrectQuestions);

// Coordinator actions
router.post("/mock-tests", protect, allowRoles("coordinator", "admin"), createMockTest);

export default router;
