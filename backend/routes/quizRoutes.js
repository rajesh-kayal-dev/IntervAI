import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { generateQuiz, submitQuizAnswer, completeQuiz, getQuizSession } from "../controllers/quizController.js";

const router = express.Router();

router.route("/").post(protect, generateQuiz);
router.route("/:id").get(protect, getQuizSession);
router.route("/:id/submit").post(protect, submitQuizAnswer);
router.route("/:id/complete").post(protect, completeQuiz);

export default router;
