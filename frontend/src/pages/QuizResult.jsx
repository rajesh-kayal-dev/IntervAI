import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';

export default function QuizResult() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const gamification = location.state?.gamification;

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setQuiz(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/quiz/setup');
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const accuracy = Math.round((quiz.score / quiz.questions.length) * 100);
  const showConfetti = accuracy >= 70;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-[#0f172a] pt-24 px-4 sm:px-6 pb-20">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}
      
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Quiz Completed!</h1>
          <p className="text-emerald-400 text-lg">You tackled {quiz.questions.length} questions on {quiz.config.topic}</p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Score Card */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay"></div>
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center mb-4">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                <motion.circle 
                  cx="80" cy="80" r="70" fill="none" 
                  stroke="#10B981" strokeWidth="12"
                  strokeDasharray="439.8"
                  initial={{ strokeDashoffset: 439.8 }}
                  animate={{ strokeDashoffset: 439.8 - (439.8 * accuracy) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-bold text-white">{accuracy}%</span>
                <p className="text-xs text-emerald-400 uppercase tracking-widest mt-1">Accuracy</p>
              </div>
            </div>
            <div className="text-gray-300">Score: {quiz.score} / {quiz.questions.length}</div>
          </motion.div>

          {/* Gamification Stats */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col justify-center space-y-6"
          >
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>🎮</span> XP & Rewards
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">XP Earned</p>
                <p className="text-3xl font-bold text-white">+{gamification ? gamification.totalXpAdded : quiz.xpEarned}</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                <p className="text-xs text-orange-400 uppercase tracking-wider mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-white">{gamification ? gamification.currentStreak : '-'}</p>
                {gamification?.streakBonus > 0 && <p className="text-xs text-orange-300 mt-1">+{gamification.streakBonus} Streak Bonus!</p>}
              </div>
            </div>

            {gamification?.leveledUp && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 text-center text-white font-semibold shadow-lg shadow-emerald-500/20"
              >
                🎉 Level Up! You are now Level {gamification.newLevel}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Detailed Review */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Detailed Review</h3>
          <div className="space-y-6">
            {quiz.questions.map((q, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border ${q.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {q.isCorrect ? <span className="text-emerald-500 text-xl">✅</span> : <span className="text-red-500 text-xl">❌</span>}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-lg text-white font-medium">{q.question}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                      {q.options.map(opt => {
                        let style = "bg-white/5 border-white/10 text-gray-400";
                        if (opt === q.correctAnswer) style = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
                        else if (opt === q.userAnswer && !q.isCorrect) style = "bg-red-500/20 border-red-500/30 text-red-400";
                        
                        return (
                          <div key={opt} className={`p-3 rounded-lg border text-sm ${style}`}>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!q.isCorrect && (
                      <div className="mt-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-300 text-sm leading-relaxed">
                        <span className="font-semibold text-emerald-400 mr-2">Explanation:</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-12"
        >
          <button onClick={() => navigate('/quiz/setup')} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-500/20">
            Start New Quiz
          </button>
          <button onClick={() => navigate('/')} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold border border-white/10 transition-colors">
            Back to Dashboard
          </button>
        </motion.div>

      </div>
    </div>
  );
}
