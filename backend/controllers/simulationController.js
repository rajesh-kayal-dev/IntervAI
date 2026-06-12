import SimulationSession from "../models/SimulationSession.js";
import axios from "axios";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// @desc    Transcribe audio using Whisper AI
// @route   POST /api/simulation/transcribe
// @access  Private
export const transcribeAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No audio file provided" });
        }

        const formData = new FormData();
        formData.append("file", new Blob([req.file.buffer]), "audio.webm");

        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/transcribe-audio`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        res.status(200).json(aiResponse.data);
    } catch (error) {
        console.error("Transcription Error:", error.message);
        res.status(500).json({ message: "Error communicating with AI STT Service" });
    }
};

// @desc    Initialize a new simulation session
// @route   POST /api/simulation/setup
// @access  Private
export const createSession = async (req, res) => {
    try {
        const {
            targetRole,
            experienceLevel,
            interviewType,
            difficulty,
            durationMinutes,
            personality,
            interviewerGender,
            jobDescription,
            companyName,
            focusAreas,
            interviewerId,
            interviewerName,
            interviewerTitle
        } = req.body;

        let resumeText = "";

        if (req.file) {
            try {
                const data = await pdfParse(req.file.buffer);
                resumeText = data.text;
            } catch (err) {
                console.error("Failed to parse PDF resume", err);
            }
        }

        const session = await SimulationSession.create({
            user: req.user._id,
            config: {
                targetRole,
                experienceLevel,
                interviewType,
                difficulty,
                durationMinutes,
                personality,
                gender: interviewerGender || 'Female',
                jobDescription,
                companyContext: `${companyName || ''} ${focusAreas ? `(Focus: ${focusAreas})` : ''}`.trim(),
                interviewerId: interviewerId || '',
                interviewerName: interviewerName || '',
                interviewerTitle: interviewerTitle || '',
                focusAreas: focusAreas || ''
            },
            resumeText
        });

        res.status(201).json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error initializing simulation" });
    }
};

import fs from 'fs';
import path from 'path';
import os from 'os';
import { EdgeTTS } from 'node-edge-tts';

// @desc    Handle chat round
// @route   POST /api/simulation/:id/chat
// @access  Private
export const chatWithInterviewer = async (req, res) => {
    try {
        const { message } = req.body;
        const session = await SimulationSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        session.transcript.push({ role: 'user', content: message });
        await session.save();

        try {
            const configWithUser = {
                ...session.config.toObject ? session.config.toObject() : session.config,
                candidateName: req.user.name || 'Candidate'
            };

            const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/simulation-chat`, {
                config: configWithUser,
                resumeText: session.resumeText,
                history: session.transcript
            });

            const reply = aiResponse.data.reply;
            const audioBase64 = aiResponse.data.audioBase64;

            session.transcript.push({ role: 'assistant', content: reply });
            await session.save();

            res.status(200).json({ reply, audioBase64 });
        } catch (aiError) {
            console.error("AI Service Error:", aiError.message);
            res.status(500).json({ message: "Error communicating with AI Service" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error during chat" });
    }
};

// @desc    Finish simulation and generate report
// @route   POST /api/simulation/:id/finish
// @access  Private
export const finishSimulation = async (req, res) => {
    try {
        const session = await SimulationSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        try {
            const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/simulation-report`, {
                config: session.config,
                resumeText: session.resumeText,
                history: session.transcript
            });

            session.report = aiResponse.data.report;
            session.isCompleted = true;
            session.completedAt = Date.now();
            await session.save();

            res.status(200).json(session);
        } catch (aiError) {
            console.error("AI Service Error:", aiError.message);
            res.status(500).json({ message: "Error generating AI report" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error during finish" });
    }
};

// @desc    Get simulation result
// @route   GET /api/simulation/:id
// @access  Private
export const getSimulationResult = async (req, res) => {
    try {
        const session = await SimulationSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (session.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        res.status(200).json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

import { generateToken04 } from '../utils/zegoToken.js';

// @desc    Update live notes during interview
// @route   POST /api/simulation-update-notes
// @access  Private
export const updateLiveNotes = async (req, res) => {
    try {
        const { config, history } = req.body;
        if (!config || !history) {
            return res.status(400).json({ message: "Missing config or history" });
        }
        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/simulation-update-notes`, {
            config,
            history
        });
        res.status(200).json(aiResponse.data);
    } catch (error) {
        console.error("Live Notes Error:", error.message);
        res.status(200).json({ notes: [], summary: "Analyzing the candidate's responses..." });
    }
};

// @desc    Get ZegoCloud credentials
// @route   GET /api/simulation/zego/credentials
// @access  Private
export const getZegoCredentials = async (req, res) => {
    try {
        const appId = parseInt(process.env.ZEGOCLOUD_APP_ID);
        const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;
        const userId = req.user._id.toString();

        const payload = JSON.stringify({
            privilege: {
                1: 1,
                2: 1
            },
            stream_id_list: null
        });

        const token = generateToken04(appId, userId, serverSecret, 86400, payload);

        res.status(200).json({
            appId,
            token,
            userId
        });
    } catch (error) {
        console.error("ZegoCloud Error:", error.message);
        res.status(500).json({ message: "Server Error getting credentials" });
    }
};
