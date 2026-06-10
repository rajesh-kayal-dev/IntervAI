import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { createSession, chatWithInterviewer, finishSimulation, getSimulationResult, transcribeAudio, getZegoCredentials } from "../controllers/simulationController.js";

const router = express.Router();

// Setup Multer for memory storage (we just need to parse the PDF text, not save it to disk permanently)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/setup", protect, upload.single('resume'), createSession);
router.post("/transcribe", protect, upload.single("audio"), transcribeAudio);
router.get("/zego/credentials", protect, getZegoCredentials);
router.post("/:id/chat", protect, chatWithInterviewer);
router.post("/:id/finish", protect, finishSimulation);
router.get("/:id", protect, getSimulationResult);

export default router;
