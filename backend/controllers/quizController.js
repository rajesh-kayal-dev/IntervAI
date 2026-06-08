import asyncHandler from 'express-async-handler';
import QuizSession from '../models/QuizSession.js';
import User from '../models/User.js';
import fetch from 'node-fetch';

const AI_SERVICE_URL = 'http://127.0.0.1:8000';

// @desc    Create a new quiz session and generate questions
// @route   POST /api/quiz/
// @access  Private
export const generateQuiz = asyncHandler(async (req, res) => {
    const { role, experienceLevel, difficulty, topic, timeMode, quizType, questionCount } = req.body;
    const userId = req.user._id;

    if (!role || !topic || !questionCount) {
        res.status(400);
        throw new Error('Please specify role, topic, and question count.');
    }

    // 1. Create session placeholder
    let quizSession = await QuizSession.create({
        user: userId,
        config: { role, experienceLevel, difficulty, topic, timeMode, quizType }
    });

    const io = req.app.get('io');
    
    // 2. Respond immediately
    res.status(202).json({
        message: 'Quiz generation started...',
        quizId: quizSession._id,
        status: 'processing'
    });

    // 3. Background task to generate questions
    (async () => {
        try {
            if (io) io.to(userId.toString()).emit('quizUpdate', { quizId: quizSession._id, status: 'GENERATING' });

            const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, difficulty, topic, count: questionCount, type: quizType }),
            });

            if (!aiResponse.ok) {
                const errorBody = await aiResponse.text();
                throw new Error(`AI Service error: ${aiResponse.status} - ${errorBody}`);
            }

            const aiData = await aiResponse.json();
            
            quizSession.questions = aiData.questions;
            await quizSession.save();

            if (io) io.to(userId.toString()).emit('quizUpdate', { quizId: quizSession._id, status: 'READY', session: quizSession });
        } catch (error) {
            console.error(`Quiz Creation Failure:`, error.message);
            if (io) io.to(userId.toString()).emit('quizUpdate', { quizId: quizSession._id, status: 'FAILED', message: error.message });
        }
    })();
});

// @desc    Get a quiz session by ID
// @route   GET /api/quiz/:id
// @access  Private
export const getQuizSession = asyncHandler(async (req, res) => {
    const quiz = await QuizSession.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }
    
    if (quiz.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to access this quiz');
    }
    res.json(quiz);
});

// @desc    Submit an answer for a single question
// @route   POST /api/quiz/:id/submit
// @access  Private
export const submitQuizAnswer = asyncHandler(async (req, res) => {
    const { questionIndex, answer, timeTakenSeconds } = req.body;
    const quiz = await QuizSession.findById(req.params.id);

    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const question = quiz.questions[questionIndex];
    if (!question) {
        res.status(400);
        throw new Error('Invalid question index');
    }

    const isCorrect = (question.correctAnswer === answer);
    
    question.userAnswer = answer;
    question.isCorrect = isCorrect;
    question.timeTakenSeconds = timeTakenSeconds || 0;

    // Base XP: 10 per correct answer
    // Multipliers: Challenge Mode = 1.5x, Hard difficulty = 1.5x
    let earnedXp = 0;
    if (isCorrect) {
        earnedXp = 10;
        if (quiz.config.timeMode === 'Challenge') earnedXp *= 1.5;
        if (quiz.config.difficulty === 'Hard') earnedXp *= 1.5;
    }

    quiz.score += isCorrect ? 1 : 0;
    quiz.xpEarned += Math.floor(earnedXp);
    
    await quiz.save();
    
    res.json({
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        xpEarned: Math.floor(earnedXp)
    });
});

// @desc    Complete the quiz and apply gamification to User
// @route   POST /api/quiz/:id/complete
// @access  Private
export const completeQuiz = asyncHandler(async (req, res) => {
    const quiz = await QuizSession.findById(req.params.id);
    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    if (quiz.isCompleted) {
        return res.json({ message: "Quiz already completed", quiz });
    }

    quiz.isCompleted = true;
    quiz.completedAt = Date.now();
    await quiz.save();

    const user = await User.findById(req.user._id);
    
    // Daily streak logic
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const lastQuiz = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
    if (lastQuiz) lastQuiz.setHours(0,0,0,0);
    
    let streakBonus = 0;
    
    if (!lastQuiz || lastQuiz < today) {
        // Did they take one yesterday?
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastQuiz && lastQuiz.getTime() === yesterday.getTime()) {
            user.currentStreak += 1;
        } else {
            user.currentStreak = 1;
        }
        
        if (user.currentStreak > user.longestStreak) {
            user.longestStreak = user.currentStreak;
        }
        
        // First quiz of the day bonus
        streakBonus = 50;
        user.lastQuizDate = new Date();
    }
    
    // Add XP
    const totalXpToAdd = quiz.xpEarned + streakBonus;
    user.xp += totalXpToAdd;
    
    // Level calc (Every 500 XP is a level up)
    const newLevel = Math.floor(user.xp / 500) + 1;
    let leveledUp = false;
    if (newLevel > user.level) {
        user.level = newLevel;
        leveledUp = true;
    }

    await user.save();

    res.json({
        quiz,
        gamification: {
            totalXpAdded: totalXpToAdd,
            streakBonus,
            currentStreak: user.currentStreak,
            newTotalXp: user.xp,
            newLevel: user.level,
            leveledUp
        }
    });
});
