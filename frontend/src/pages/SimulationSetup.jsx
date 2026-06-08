import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { Briefcase, User, Clock, Building, UploadCloud, ChevronRight, ChevronLeft, Bot } from 'lucide-react';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'config', label: 'Interview Config', icon: Briefcase },
  { id: 'context', label: 'Company Context', icon: Building },
  { id: 'resume', label: 'Resume & Personality', icon: Bot },
];

export default function SimulationSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resumeFile, setResumeFile] = useState(null);

  const LOADING_MESSAGES = [
    "Reading Resume...",
    "Analyzing Experience...",
    "Reading Job Description...",
    "Researching Company Context...",
    "Building Interview Strategy...",
    "Creating Questions...",
    "Preparing Evaluation Criteria..."
  ];

  React.useEffect(() => {
    let interval;
    if (isSubmitting) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const [formData, setFormData] = useState({
    fullName: '',
    targetRole: 'Full Stack Developer',
    experienceLevel: 'Mid-Level',
    yearsOfExperience: '3',
    interviewType: 'Technical',
    difficulty: 'Medium',
    durationMinutes: '15',
    companyName: '',
    jobDescription: '',
    focusAreas: '',
    interviewerGender: 'Female',
    personality: 'Friendly Recruiter',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep !== STEPS.length - 1) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (resumeFile) data.append('resume', resumeFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/simulation/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: data
      });

      if (!res.ok) throw new Error('Failed to setup simulation');

      const sessionData = await res.json();
      navigate(`/simulation/room/${sessionData._id}`);
    } catch (err) {
      toast.error(err.message || 'Error setting up interview');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4 sm:px-6 flex justify-center text-gray-200 font-sans">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
            Premium AI Interview Simulation
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
            Experience a hyper-realistic video interview. Customize your interviewer, upload your context, and test your skills in a real-time Zoom-like environment.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-800 -z-10 -translate-y-1/2"></div>
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500 ${idx <= currentStep ? 'bg-indigo-600 border-indigo-900 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`mt-2 text-xs font-semibold tracking-wide uppercase ${idx <= currentStep ? 'text-indigo-400' : 'text-gray-600'}`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>

          <form onSubmit={handleSubmit} className="relative z-10">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Basic Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Target Role</label>
                      <input type="text" name="targetRole" value={formData.targetRole} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Experience Level</label>
                      <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Junior">Junior</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Years of Experience</label>
                    <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} required className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Interview Configuration</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Interview Type</label>
                      <select name="interviewType" value={formData.interviewType} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Technical">Technical</option>
                        <option value="HR">HR</option>
                        <option value="Behavioral">Behavioral</option>
                        <option value="System Design">System Design</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
                      <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                        <option value="FAANG">FAANG Level</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration (Minutes)</label>
                    <select name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="5">5 Minutes</option>
                      <option value="10">10 Minutes</option>
                      <option value="15">15 Minutes</option>
                      <option value="20">20 Minutes</option>
                      <option value="30">30 Minutes</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">Company Context</h2>
                  <p className="text-gray-400 text-sm mb-6">Optional. Provide details to make the interview hyper-relevant to a specific job opening.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Company Name (Optional)</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Job Description (Optional)</label>
                    <textarea name="jobDescription" rows="4" value={formData.jobDescription} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Interview Focus Areas (Optional)</label>
                    <input type="text" name="focusAreas" value={formData.focusAreas} onChange={handleChange} placeholder="e.g., React, Microservices, Scalability" className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Resume & Personality</h2>
                  
                  {/* Resume Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Upload Resume (PDF - Optional)</label>
                    <div className="w-full border-2 border-dashed border-gray-600 hover:border-indigo-500 bg-gray-900/30 rounded-2xl p-8 text-center transition-colors">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="resume-upload" />
                      <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud className="w-10 h-10 text-indigo-400 mb-3" />
                        <span className="text-gray-300 font-medium">{resumeFile ? resumeFile.name : 'Click to upload your resume'}</span>
                        <span className="text-gray-500 text-sm mt-1">PDF format only</span>
                      </label>
                    </div>
                  </div>

                  {/* Interviewer Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Interviewer Gender</label>
                      <select name="interviewerGender" value={formData.interviewerGender} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Interviewer Personality</label>
                      <select name="personality" value={formData.personality} onChange={handleChange} className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Friendly Recruiter">Friendly Recruiter</option>
                        <option value="Senior Engineering Manager">Senior Engineering Manager</option>
                        <option value="FAANG Interviewer">FAANG Interviewer (Strict)</option>
                        <option value="Startup Founder">Startup Founder</option>
                        <option value="Technical Architect">Technical Architect</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-white/10">
              {isSubmitting ? (
                <div className="w-full flex flex-col items-center justify-center py-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={loadingStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-indigo-400 font-medium text-lg"
                    >
                      {LOADING_MESSAGES[loadingStep]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    {currentStep === STEPS.length - 1 ? 'Start Simulation' : 'Continue'} <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
