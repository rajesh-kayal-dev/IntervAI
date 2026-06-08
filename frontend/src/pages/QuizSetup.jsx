import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const STEPS = [
  { id: 'role', title: 'Target Role', options: ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data Analyst'] },
  { id: 'experience', title: 'Experience Level', options: ['Fresher', '1-2 Years', '3-5 Years', 'Senior'] },
  { id: 'topic', title: 'Topic Selection', options: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'SQL', 'System Design'] },
  { id: 'difficulty', title: 'Difficulty', options: ['Easy', 'Medium', 'Hard', 'Mixed'] },
  { id: 'count', title: 'Questions', options: [5, 10, 15, 20] },
  { id: 'quizType', title: 'Quiz Type', options: ['Technical', 'HR', 'Mixed'] },
  { id: 'timeMode', title: 'Time Mode', options: ['Normal', 'Challenge'] },
];

export default function QuizSetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    role: '', experience: '', topic: '', difficulty: '', count: 5, quizType: '', timeMode: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (val) => {
    const stepId = STEPS[currentStep].id;
    setConfig({ ...config, [stepId]: val });
    
    if (currentStep < STEPS.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 300);
    } else {
      generateQuiz({ ...config, [stepId]: val });
    }
  };

  const generateQuiz = async (finalConfig) => {
    setIsGenerating(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/quiz`, {
        role: finalConfig.role,
        experienceLevel: finalConfig.experience,
        difficulty: finalConfig.difficulty,
        topic: finalConfig.topic,
        questionCount: finalConfig.count,
        quizType: finalConfig.quizType,
        timeMode: finalConfig.timeMode
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Wait a moment for generation
      // The backend actually emits socket events, but since this is async we might just poll or wait.
      // Wait, the backend returns status 202 processing. We should wait for socket 'quizUpdate', 
      // but to keep it simple we can just navigate to the runner, which will show a loading spinner until it's ready.
      
      navigate(`/quiz/run/${data.quizId}`);
    } catch (error) {
      toast.error('Failed to start quiz');
      setIsGenerating(false);
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-900 via-gray-900 to-[#0f172a]">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative w-full max-w-2xl bg-white/10 backdrop-blur-2xl rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-white/5 w-full">
          <motion.div 
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!isGenerating ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                {step.title}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-8">
                {step.options.map((opt) => (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className="p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-emerald-500 hover:border-emerald-400 text-white font-medium transition-all shadow-lg hover:shadow-emerald-500/25"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
              
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(p => p - 1)}
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium mt-8"
                >
                  ← Go Back
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">AI is crafting your quiz...</h3>
              <p className="text-emerald-400/80">Tailoring {config.count} {config.difficulty} questions on {config.topic}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
