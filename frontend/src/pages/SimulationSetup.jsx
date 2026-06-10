import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { Briefcase, User, Clock, Building, UploadCloud, ChevronRight, ChevronLeft, Bot, Star, Sparkles, Mic, Video } from 'lucide-react';
import { INTERVIEWER_PROFILES, getInterviewer } from '../data/interviewerProfiles';

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'config', label: 'Interview Config', icon: Briefcase },
  { id: 'context', label: 'Company Context', icon: Building },
  { id: 'interviewer', label: 'Choose Interviewer', icon: Star },
  { id: 'resume', label: 'Resume & Ready', icon: Mic },
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
    "Preparing Evaluation Criteria...",
    "Almost Ready..."
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
    personality: 'Senior Engineering Manager',
    interviewerId: 'sarah'
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const selectInterviewer = (gender, profile) => {
    setFormData({
      ...formData,
      interviewerGender: gender,
      personality: profile.title,
      interviewerId: profile.id,
      interviewerName: profile.fullName,
      interviewerTitle: profile.title
    });
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
        headers: { Authorization: `Bearer ${user.token}` },
        body: data
      });

      if (!res.ok) throw new Error('Failed to setup simulation');

      const sessionData = await res.json();
      navigate('/simulation/lobby', { state: { ...formData, sessionId: sessionData._id, sessionData } });
    } catch (err) {
      toast.error(err.message || 'Error setting up interview');
      setIsSubmitting(false);
    }
  };

  const selectedInterviewer = getInterviewer(formData.interviewerGender, formData.interviewerId);

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 sm:px-6 flex justify-center text-gray-200 font-sans">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight">
            Premium AI Interview Simulation
          </h1>
          <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
            Experience a hyper-realistic video interview with a professional AI interviewer. Customize everything and feel like it's a real Zoom call.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-zinc-800 -z-10 -translate-y-1/2"></div>
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500 ${idx <= currentStep ? 'bg-indigo-600 border-indigo-900 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`mt-2 text-xs font-semibold tracking-wide uppercase ${idx <= currentStep ? 'text-indigo-400' : 'text-zinc-600'}`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>

          <form onSubmit={handleSubmit} className="relative z-10">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Basic Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter your full name" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Target Role</label>
                      <input type="text" name="targetRole" value={formData.targetRole} onChange={handleChange} required className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Experience Level</label>
                      <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Junior">Junior</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Years of Experience</label>
                    <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} required className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Interview Configuration</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Interview Type</label>
                      <select name="interviewType" value={formData.interviewType} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Technical">Technical</option>
                        <option value="HR">HR</option>
                        <option value="Behavioral">Behavioral</option>
                        <option value="System Design">System Design</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Difficulty</label>
                      <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                        <option value="FAANG">FAANG Level</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Duration (Minutes)</label>
                    <select name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="5">5 Minutes (Quick)</option>
                      <option value="10">10 Minutes</option>
                      <option value="15">15 Minutes (Standard)</option>
                      <option value="20">20 Minutes</option>
                      <option value="30">30 Minutes (Deep Dive)</option>
                      <option value="45">45 Minutes (Extended)</option>
                      <option value="60">60 Minutes (Full Loop)</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">Company & Job Context</h2>
                  <p className="text-zinc-400 text-sm mb-6">Optional. Provide details to make the interview hyper-relevant to a specific company or role.</p>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Company Name (Optional)</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g., Google, Microsoft, Razorpay, Flipkart..." className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Job Description (Optional)</label>
                    <textarea name="jobDescription" rows="4" value={formData.jobDescription} onChange={handleChange} placeholder="Paste the job description here..." className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Focus Areas (Optional)</label>
                    <input type="text" name="focusAreas" value={formData.focusAreas} onChange={handleChange} placeholder="e.g., React, Microservices, System Design, Python" className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">Choose Your Interviewer</h2>
                  <p className="text-zinc-400 text-sm mb-6">Select the AI interviewer who will conduct your session. Each has a unique personality and style.</p>

                  {/* Gender Toggle */}
                  <div className="flex gap-2 mb-6 bg-zinc-900 rounded-xl p-1 w-fit border border-zinc-800">
                    {['Female', 'Male'].map(gender => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setFormData({ ...formData, interviewerGender: gender, interviewerId: INTERVIEWER_PROFILES[gender][0].id, personality: INTERVIEWER_PROFILES[gender][0].title })}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${formData.interviewerGender === gender ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>

                  {/* Interviewer Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {INTERVIEWER_PROFILES[formData.interviewerGender].map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => selectInterviewer(formData.interviewerGender, profile)}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all ${formData.interviewerId === profile.id
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50'
                          }`}
                      >
                        {formData.interviewerId === profile.id && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        {/* Avatar preview */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 mb-3 flex items-center justify-center overflow-hidden border-2 border-zinc-700">
                          <span className="text-2xl font-bold text-indigo-400">
                            {profile.name[0]}
                          </span>
                        </div>
                        <h3 className="text-white font-bold">{profile.fullName}</h3>
                        <p className="text-indigo-400 text-sm font-medium">{profile.title}</p>
                        <div className="flex items-center gap-2 mt-1 mb-2">
                          <span className="text-xs text-zinc-500">{profile.experience}</span>
                          <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                          <span className="text-xs text-zinc-500">{profile.exCompany}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{profile.personality}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-6">Resume & Final Preparation</h2>

                  {/* Resume Upload */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Upload Resume (PDF - Optional)</label>
                    <div className="w-full border-2 border-dashed border-zinc-700 hover:border-indigo-500 bg-zinc-900/30 rounded-2xl p-8 text-center transition-colors">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="resume-upload" />
                      <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud className="w-10 h-10 text-indigo-400 mb-3" />
                        <span className="text-zinc-300 font-medium">{resumeFile ? resumeFile.name : 'Click to upload your resume'}</span>
                        <span className="text-zinc-500 text-sm mt-1">PDF format only</span>
                      </label>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                      Interview Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-zinc-400">Role:</div>
                      <div className="text-white font-medium">{formData.targetRole}</div>
                      <div className="text-zinc-400">Type:</div>
                      <div className="text-white font-medium">{formData.interviewType}</div>
                      <div className="text-zinc-400">Duration:</div>
                      <div className="text-white font-medium">{formData.durationMinutes} minutes</div>
                      <div className="text-zinc-400">Interviewer:</div>
                      <div className="text-white font-medium">{selectedInterviewer?.fullName} ({selectedInterviewer?.title})</div>
                      {formData.companyName && (
                        <>
                          <div className="text-zinc-400">Company:</div>
                          <div className="text-white font-medium">{formData.companyName}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-500 text-sm text-center">
                    <Video className="w-4 h-4 inline mr-1" />
                    You'll be able to check your camera, microphone, and internet before joining.
                  </p>
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
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    {currentStep === STEPS.length - 1 ? 'Check Devices & Join' : 'Continue'} <ChevronRight className="w-4 h-4" />
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
