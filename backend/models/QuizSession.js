import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    userAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
    timeTakenSeconds: { type: Number, default: 0 }
});

const quizSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    config: {
        role: { type: String, required: true },
        experienceLevel: { type: String, required: true },
        difficulty: { type: String, required: true },
        topic: { type: String, required: true },
        timeMode: { type: String, required: true },
        quizType: { type: String, required: true }
    },
    questions: [quizQuestionSchema],
    isCompleted: {
        type: Boolean,
        default: false
    },
    score: {
        type: Number,
        default: 0
    },
    xpEarned: {
        type: Number,
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

const QuizSession = mongoose.model("QuizSession", quizSessionSchema);
export default QuizSession;
