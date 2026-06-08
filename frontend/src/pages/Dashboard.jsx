import { useState, useEffect } from "react"
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createSession, getSessions, reset, deleteSession } from '../features/sessions/sessionSlice'
import { toast } from 'react-toastify'
import SessionCard from "../components/SessionCard"
import { Mic, Rocket } from 'lucide-react'

const ROLES = [
  "MERN Stack Developer",
  "MEAN Stack Developer",
  "Full Stack Python",
  "Full Stack Java",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Engineer (AWS/Azure/GCP)",
  "Cybersecurity Engineer",
  "Blockchain Developer",
  "Mobile Developer (iOS/Android)",
  "Game Developer",
  "UI/UX Designer",
  "QA Automation Engineer",
  "Product Manager"
];
const LEVELS = ["Junior", "Mid-Level", "Senior"];
const TYPES = [{ label: 'Oral only', value: 'oral-only' }, { label: 'Coding Mix', value: 'coding-mix' }];
const COUNTS = [5, 10, 15];

const SelectField = ({ label, name, value, onChange, children, icon }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono ml-1">
      {icon && <span className="text-[#1B6C42]">{icon}</span>}
      {label}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white/80 border border-gray-200 hover:border-[#1B6C42]/50 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/15 outline-none transition-all duration-200 cursor-pointer shadow-sm"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value, subtext, color, icon }) => (
  <div className="group relative bg-white/70 backdrop-blur-xl border border-white/60 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 -translate-y-4 translate-x-4 ${color}`} />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} bg-opacity-10 text-sm`}>{icon}</span>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 font-mono leading-none">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1.5 font-medium">{subtext}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { sessions, isLoading, isGenerating, isError, message } = useSelector((state) => state.sessions);
  const isProcessing = isGenerating;

  const [formData, setFormData] = useState({
    role: user.preferredRole || ROLES[0],
    level: LEVELS[0],
    interviewType: TYPES[1].value,
    count: COUNTS[0],
  });

  useEffect(() => {
    dispatch(getSessions());
  }, [dispatch]);

  useEffect(() => {
    if (isError && message) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({ ...prevState, [e.target.name]: e.target.value }));
  }

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(createSession(formData));
  }

  const viewSession = (session) => {
    if (session.status === 'completed') {
      navigate(`/review/${session._id}`);
    } else if (session.status === 'in-progress') {
      navigate(`/interview/${session._id}`);
    } else {
      toast.info('Session not ready yet')
    }
  }

  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      dispatch(deleteSession(sessionId));
      toast.error('Session Deleted')
    }
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const inProgressSessions = sessions.filter(s => s.status === 'in-progress').length;
  const completedWithScore = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number');
  const avgScore = completedWithScore.length > 0
    ? (completedWithScore.reduce((sum, s) => sum + s.overallScore, 0) / completedWithScore.length).toFixed(0)
    : '--';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 space-y-10 animate-in fade-in duration-700">

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] text-[#1B6C42] font-bold uppercase tracking-widest font-mono mb-2">
            {getGreeting()} 👋
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-none">
            Welcome back,{" "}
            <span className="font-playfair italic font-semibold text-[#1B6C42]">
              {user.name.split(' ')[0]}
            </span>
          </h1>
          <p className="text-gray-500 mt-3 text-sm font-medium max-w-md">
            Your AI-powered interview coach is ready. Start a new session or review your past performance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest bg-white/60 border border-white/50 px-4 py-2 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 bg-[#1B6C42] rounded-full animate-pulse" />
          AI Evaluator Active
        </div>
      </div>

      {/* AI Simulation Banner */}
      <div 
        onClick={() => navigate('/simulation/setup')}
        className="group relative bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 sm:p-10 cursor-pointer overflow-hidden shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/40 transition-all duration-300 mb-6"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-400/20 to-transparent transform translate-x-10 group-hover:translate-x-0 transition-transform duration-500"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mic className="w-8 h-8 text-blue-300" /> Real-Time AI Interview
              <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg shadow-pink-500/30">Beta</span>
            </h2>
            <p className="text-blue-100 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
              Experience a hyper-realistic Zoom-style video interview. Speak naturally with an AI Recruiter, upload your resume for context, and get a premium evaluation.
            </p>
          </div>
          
          <button className="flex-shrink-0 bg-white text-blue-900 font-bold px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform duration-300 flex items-center gap-2">
            Start Video Interview 
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </button>
        </div>
      </div>

      {/* AI Quiz Banner */}
      <div 
        onClick={() => navigate('/quiz/setup')}
        className="group relative bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-3xl p-8 sm:p-10 cursor-pointer overflow-hidden shadow-xl shadow-emerald-900/20 hover:shadow-2xl hover:shadow-emerald-900/40 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-400/20 to-transparent transform translate-x-10 group-hover:translate-x-0 transition-transform duration-500"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Rocket className="w-8 h-8 text-emerald-300" /> Premium AI Quiz
              <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg shadow-orange-500/30">New</span>
            </h2>
            <p className="text-emerald-100 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
              Challenge yourself with dynamic, AI-generated questions. Earn XP, build your streak, and level up your skills in our gamified Quiz Mode.
            </p>
          </div>
          
          <button className="flex-shrink-0 bg-white text-emerald-900 font-bold px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform duration-300 flex items-center gap-2">
            Start Quiz 
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Sessions"
          value={totalSessions}
          subtext={inProgressSessions > 0 ? `${inProgressSessions} in progress` : "All sessions"}
          color="bg-blue-500"
          icon={
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={completedSessions}
          subtext="Fully evaluated"
          color="bg-emerald-500"
          icon={
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Avg Score"
          value={avgScore !== '--' ? `${avgScore}%` : '--'}
          subtext={avgScore !== '--' ? (avgScore >= 70 ? "Great performance!" : "Keep practicing") : "No scores yet"}
          color="bg-amber-500"
          icon={
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* New Session Form */}
      <div className="spotlight-card bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-md overflow-hidden">
        <div className="spotlight-content">
          {/* Form Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-gray-100/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1B6C42]/10 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-[#1B6C42]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Start New Session</h2>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-0.5">AI-generated interview questions</p>
              </div>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#1B6C42] bg-[#1B6C42]/5 px-3 py-1.5 rounded-full border border-[#1B6C42]/15 animate-pulse">
                <span className="w-1.5 h-1.5 bg-[#1B6C42] rounded-full" />
                Generating questions...
              </div>
            )}
          </div>

          {/* Form Body */}
          <form onSubmit={onSubmit} className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <SelectField
                label="Role"
                name="role"
                value={formData.role}
                onChange={onChange}
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </SelectField>

              <SelectField
                label="Experience Level"
                name="level"
                value={formData.level}
                onChange={onChange}
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              >
                {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </SelectField>

              <SelectField
                label="Questions"
                name="count"
                value={formData.count}
                onChange={onChange}
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                {COUNTS.map((count) => <option key={count} value={count}>{count} Questions</option>)}
              </SelectField>

              <SelectField
                label="Interview Type"
                name="interviewType"
                value={formData.interviewType}
                onChange={onChange}
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                }
              >
                {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </SelectField>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className={`relative overflow-hidden group w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 transition-all duration-300 ${
                isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#1B6C42] hover:bg-[#155A35] shadow-md shadow-[#1B6C42]/20 hover:shadow-lg hover:shadow-[#1B6C42]/25 hover:scale-[1.01] active:scale-[0.99] btn-shimmer'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                  <span className="text-gray-500">Generating Interview Questions...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Interview Session
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Session History */}
      <div className="space-y-5 pb-24 sm:pb-8">
        <div className="flex items-center justify-between">
          <h2 className="font-playfair text-2xl font-semibold text-gray-950 flex items-center gap-3">
            <span className="w-9 h-9 bg-white/70 border border-white/50 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Interview History
          </h2>
          {sessions.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-white/50 border border-white/40 px-3 py-1 rounded-full">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          )}
        </div>

        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-[#1B6C42]/20 animate-ping" />
              <div className="relative w-12 h-12 border-2 border-t-[#1B6C42] border-[#1B6C42]/10 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium font-mono">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm border border-dashed border-gray-300 rounded-3xl py-20 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#1B6C42]/5 border border-[#1B6C42]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#1B6C42]/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-gray-500 font-semibold text-base mb-1">No sessions yet</p>
            <p className="text-gray-400 text-sm font-light">Create your first interview session above to begin your preparation journey.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session._id} session={session} onClick={viewSession} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
