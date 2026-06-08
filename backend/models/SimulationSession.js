import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const simulationSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    config: {
        targetRole: { type: String, required: true },
        experienceLevel: { type: String, required: true },
        interviewType: { type: String, required: true },
        difficulty: { type: String, required: true },
        durationMinutes: { type: Number, required: true },
        personality: { type: String, required: true },
        gender: { type: String, required: true },
        jobDescription: { type: String, default: "" },
        companyContext: { type: String, default: "" }
    },
    resumeText: {
        type: String,
        default: ""
    },
    transcript: [chatMessageSchema],
    isCompleted: {
        type: Boolean,
        default: false
    },
    report: {
        overallScore: { type: Number, default: 0 },
        technicalScore: { type: Number, default: 0 },
        communicationScore: { type: Number, default: 0 },
        confidenceScore: { type: Number, default: 0 },
        problemSolvingScore: { type: Number, default: 0 },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        missedOpportunities: [{ type: String }],
        suggestedBetterAnswers: [{ type: String }],
        hiringRecommendation: { type: String, default: "" },
        learningPlan: [{ type: String }]
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

const SimulationSession = mongoose.model("SimulationSession", simulationSessionSchema);
export default SimulationSession;
