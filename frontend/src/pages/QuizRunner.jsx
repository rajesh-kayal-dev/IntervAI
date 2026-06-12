import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import useSocket from '../hooks/useSocket';

export default function QuizRunner() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Waiting for AI to finish...');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const quizReadyRef = useRef(false); // Prevent double-start from socket + poll

  // ─── Polling fallback: every 3s check if questions are ready ───────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      if (quizReadyRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/quiz/${quizId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        if (data.questions && data.questions.length > 0) {
          quizReadyRef.current = true;
          clearInterval(pollRef.current);
          pollRef.current = null;
          setQuiz(data);
          setLoading(false);
          startTimer(data.config.timeMode === 'Challenge' ? 5 : 15);
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }
    }, 3000);
  }, [quizId]);

  // ─── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/quiz/${quizId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (data.questions && data.questions.length > 0) {
          quizReadyRef.current = true;
          setQuiz(data);
          setLoading(false);
          startTimer(data.config.timeMode === 'Challenge' ? 5 : 15);
        } else {
          // Not ready yet — start polling
          setLoading(true);
          setStatusText('AI is crafting your questions...');
          startPolling();
        }
      } catch (err) {
        toast.error('Failed to load quiz');
        navigate('/quiz/setup');
      }
    };
    fetchQuiz();

    return () => {
      clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [quizId]);

  // ─── Socket listener for quiz ready ───────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data.quizId?.toString() !== quizId?.toString()) return;

      if (data.status === 'READY' && !quizReadyRef.current) {
        quizReadyRef.current = true;
        clearInterval(pollRef.current);
        pollRef.current = null;
        setQuiz(data.session);
        setLoading(false);
        startTimer(data.session.config.timeMode === 'Challenge' ? 5 : 15);
      } else if (data.status === 'FAILED') {
        toast.error(data.message || 'Failed to generate quiz');
        navigate('/quiz/setup');
      } else if (data.status === 'GENERATING') {
        setStatusText('AI is crafting your questions...');
      }
    };

    socket.on('quizUpdate', handleUpdate);
    return () => socket.off('quizUpdate', handleUpdate);
  }, [socket, quizId]);

  // ─── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = (seconds) => {
    clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handleTimeUp = () => {
    if (!selectedOpt) {
      submitAnswer('TIMEOUT');
    }
  };

  const handleSelect = (opt) => {
    if (isAnswering) return;
    setSelectedOpt(opt);
    clearInterval(timerRef.current);
    submitAnswer(opt);
  };

  const submitAnswer = async (answer) => {
    setIsAnswering(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const timeTaken = (quiz.config.timeMode === 'Challenge' ? 5 : 15) - timeLeft;

      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/quiz/${quizId}/submit`, {
        questionIndex: currentIdx,
        answer,
        timeTakenSeconds: timeTaken
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setFeedback(data.isCorrect ? 'correct' : 'wrong');

      const updatedQuiz = { ...quiz };
      updatedQuiz.questions[currentIdx].userAnswer = answer;
      updatedQuiz.questions[currentIdx].isCorrect = data.isCorrect;
      setQuiz(updatedQuiz);

      setTimeout(() => {
        if (currentIdx < quiz.questions.length - 1) {
          setCurrentIdx(prev => prev + 1);
          setSelectedOpt(null);
          setFeedback(null);
          setIsAnswering(false);
          startTimer(quiz.config.timeMode === 'Challenge' ? 5 : 15);
        } else {
          finishQuiz();
        }
      }, 2500);

    } catch (err) {
      toast.error('Failed to submit answer');
      setIsAnswering(false);
    }
  };

  const finishQuiz = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/quiz/${quizId}/complete`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      navigate(`/quiz/result/${quizId}`, { state: { gamification: data.gamification } });
    } catch (err) {
      toast.error('Failed to complete quiz');
    }
  };

  // ─── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md p-8 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-white text-xl mb-6 font-medium tracking-wide">{statusText}</p>

          {/* Animated Progress Bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] rounded-full"
              initial={{ width: '5%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 25, ease: 'easeOut' }}
            />
          </div>
          <p className="text-emerald-400/60 text-xs mt-4 font-mono uppercase tracking-widest">Estimated time: 15-30s</p>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentIdx];
  const maxTime = quiz.config.timeMode === 'Challenge' ? 5 : 15;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        {/* Header / Progress */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30">
              {quiz.config.topic}
            </span>
            {quiz.config.timeMode === 'Challenge' && (
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold border border-orange-500/30 flex items-center gap-1">
                ⏱️ Challenge
              </span>
            )}
          </div>
          <div className="text-gray-400 font-mono">
            {currentIdx + 1} / {quiz.questions.length}
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full mb-8 overflow-hidden">
          <motion.div
            className={`h-full ${timeLeft <= 2 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
            transition={{ ease: 'linear', duration: 1 }}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
          >
            <h2 className="text-2xl text-white font-medium leading-relaxed mb-8">
              {q.question}
            </h2>

            <div className="space-y-4">
              {q.options.map((opt, i) => {
                let btnState = 'default';
                if (isAnswering) {
                  if (opt === q.correctAnswer) btnState = 'correct';
                  else if (opt === selectedOpt && opt !== q.correctAnswer) btnState = 'wrong';
                  else btnState = 'faded';
                }

                let styles = 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:border-white/30';
                if (btnState === 'correct') styles = 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                if (btnState === 'wrong') styles = 'border-red-500 bg-red-500/20 text-red-400';
                if (btnState === 'faded') styles = 'border-white/5 bg-transparent text-gray-500 opacity-50';

                return (
                  <motion.button
                    key={i}
                    whileHover={!isAnswering ? { scale: 1.01 } : {}}
                    whileTap={!isAnswering ? { scale: 0.99 } : {}}
                    onClick={() => handleSelect(opt)}
                    disabled={isAnswering}
                    className={`w-full p-5 text-left rounded-xl border transition-all duration-300 ${styles}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{opt}</span>
                      {btnState === 'correct' && <span className="text-2xl">✅</span>}
                      {btnState === 'wrong' && <span className="text-2xl">❌</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation box */}
            {isAnswering && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-4 rounded-xl border ${feedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 'bg-red-500/10 border-red-500/20 text-red-100'}`}
              >
                <p className="text-sm font-semibold mb-1">{feedback === 'correct' ? 'Excellent!' : 'Incorrect.'}</p>
                <p className="text-sm opacity-90">{q.explanation}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
