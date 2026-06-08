import express from 'express';
import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const AI_SERVICE_URL = 'http://127.0.0.1:8000';

// @desc  Proxy chat messages to AI service for IntervBot
// @route POST /api/bot/chat
// @access Private
router.post('/chat', protect, asyncHandler(async (req, res) => {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400);
        throw new Error('messages array is required');
    }

    const aiResponse = await fetch(`${AI_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context: context || '' }),
    });

    if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        res.status(502);
        throw new Error(`AI service error: ${errText}`);
    }

    const data = await aiResponse.json();
    res.json(data);
}));

export default router;
