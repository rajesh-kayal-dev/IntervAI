import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import { Trophy, Code2, BrainCircuit, Target, Sparkles } from 'lucide-react';

export default function PublicQuizResult() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchPublicResult();
  }, [quizId]);

  const fetchPublicResult = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/quiz/${quizId}/public`);
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const showConfetti = data.accuracy >= 70;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] pt-20 px-4 pb-20 relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={600} colors={['#10B981', '#3B82F6', '#8B5CF6']} />}
      
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center relative z-10 space-y-10 mt-10">
        
        {/* Brand/Logo Area */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <BrainCircuit className="w-8 h-8 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-white">Interv<span className="text-emerald-400">AI</span></span>
        </motion.div>

        {/* Public Score Card */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
            {data.userName} crushed a quiz!
          </h1>
          <p className="text-gray-400 text-lg mb-10 flex items-center justify-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" /> Topic: <span className="text-white font-medium">{data.config.topic}</span>
          </p>

          <div className="relative w-56 h-56 rounded-full flex items-center justify-center mb-10">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-2xl">
              <circle cx="112" cy="112" r="100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
              <motion.circle 
                cx="112" cy="112" r="100" fill="none" 
                stroke="url(#gradient)" strokeWidth="18"
                strokeDasharray="628"
                initial={{ strokeDashoffset: 628 }}
                animate={{ strokeDashoffset: 628 - (628 * data.accuracy) / 100 }}
                transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center z-10">
              <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400 drop-shadow-sm">
                {data.accuracy}%
              </span>
              <p className="text-sm text-gray-400 uppercase tracking-[0.2em] mt-2 font-semibold">Accuracy</p>
            </div>
            
            {/* Floating badges */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} className="absolute -bottom-4 -right-4 p-4 bg-gray-900 border border-gray-700 rounded-full shadow-xl">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} className="absolute -top-4 -left-4 p-4 bg-gray-900 border border-gray-700 rounded-full shadow-xl">
              <Target className="w-8 h-8 text-red-400" />
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center">
              <span className="text-gray-400 text-sm uppercase tracking-wider mb-1">Score</span>
              <span className="text-2xl font-bold text-white">{data.score} / {data.totalQuestions}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center">
              <span className="text-gray-400 text-sm uppercase tracking-wider mb-1">Difficulty</span>
              <span className="text-2xl font-bold text-white">{data.config.difficulty}</span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center space-y-6"
        >
          <p className="text-gray-300 text-lg">Think you can do better?</p>
          <button 
            onClick={() => navigate('/')} 
            className="group relative px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-3 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Try IntervAI For Free
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </motion.div>

      </div>
    </div>
  );
}
