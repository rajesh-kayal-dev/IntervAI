import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Award, Briefcase, ChevronRight, Target, BrainCircuit, Activity, ThumbsUp, AlertTriangle, BookOpen, Lightbulb, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-toastify';

export default function SimulationResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (!data.isCompleted || !data.report) {
        toast.info("Report is still being generated...");
        // In a real app we might poll here, but for now we assume it finished before navigation
      }
      setSession(data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load simulation report');
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-indigo-400 font-medium">Generating Comprehensive Premium Report...</p>
      </div>
    );
  }

  const { report, config } = session;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const isHire = report.hiringRecommendation.toLowerCase().includes('hire') && !report.hiringRecommendation.toLowerCase().includes('do not');

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full uppercase tracking-wider border border-indigo-500/30">
                {config.interviewType} Interview
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-full uppercase tracking-wider border border-purple-500/30">
                {config.difficulty} Level
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{config.targetRole} Assessment</h1>
            <p className="text-gray-400 mt-2 font-medium">Conducted by: {config.personality}</p>
          </div>
          
          <div className="relative z-10 text-right">
            <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mb-1">Overall Score</p>
            <div className={`text-6xl font-black ${report.overallScore >= 80 ? 'text-emerald-400' : report.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {report.overallScore}<span className="text-2xl text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Hiring Decision */}
        <div className={`p-8 rounded-3xl border flex items-start gap-6 shadow-xl ${isHire ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isHire ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {isHire ? <UserCheck className="w-8 h-8" /> : <UserX className="w-8 h-8" />}
          </div>
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isHire ? 'text-emerald-400' : 'text-red-400'}`}>
              {isHire ? 'Recommended for Hire' : 'Not Recommended at this time'}
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">{report.hiringRecommendation}</p>
          </div>
        </div>

        {/* Score Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-semibold tracking-wide">Technical</span>
              <BrainCircuit className="w-5 h-5 text-blue-400" />
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-xl inline-block border ${getScoreColor(report.technicalScore)}`}>
              {report.technicalScore}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-semibold tracking-wide">Communication</span>
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-xl inline-block border ${getScoreColor(report.communicationScore)}`}>
              {report.communicationScore}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-semibold tracking-wide">Confidence</span>
              <Activity className="w-5 h-5 text-pink-400" />
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-xl inline-block border ${getScoreColor(report.confidenceScore)}`}>
              {report.confidenceScore}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-semibold tracking-wide">Problem Solving</span>
              <Lightbulb className="w-5 h-5 text-yellow-400" />
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-xl inline-block border ${getScoreColor(report.problemSolvingScore)}`}>
              {report.problemSolvingScore}%
            </div>
          </div>
        </div>

        {/* Analysis Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Strengths & Weaknesses */}
          <div className="space-y-8">
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-8 rounded-3xl backdrop-blur">
              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-6">
                <ThumbsUp className="w-6 h-6" /> Key Strengths
              </h3>
              <ul className="space-y-4">
                {report.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-3 text-emerald-100/80 leading-relaxed">
                    <span className="text-emerald-500 mt-1">•</span> {str}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-3xl backdrop-blur">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2 mb-6">
                <AlertTriangle className="w-6 h-6" /> Weaknesses & Mistakes
              </h3>
              <ul className="space-y-4">
                {report.weaknesses.map((wk, i) => (
                  <li key={i} className="flex items-start gap-3 text-red-100/80 leading-relaxed">
                    <span className="text-red-500 mt-1">•</span> {wk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feedback & Learning Plan */}
          <div className="space-y-8">
            <div className="bg-amber-900/10 border border-amber-500/20 p-8 rounded-3xl backdrop-blur">
              <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2 mb-6">
                <Briefcase className="w-6 h-6" /> Suggested Better Answers
              </h3>
              <ul className="space-y-4">
                {report.suggestedBetterAnswers.map((sug, i) => (
                  <li key={i} className="flex items-start gap-3 text-amber-100/80 leading-relaxed">
                    <span className="text-amber-500 mt-1">→</span> {sug}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-900/10 border border-blue-500/20 p-8 rounded-3xl backdrop-blur">
              <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-6">
                <BookOpen className="w-6 h-6" /> Personalized Learning Roadmap
              </h3>
              <ul className="space-y-4">
                {report.learningPlan.map((plan, i) => (
                  <li key={i} className="flex items-start gap-3 text-blue-100/80 leading-relaxed bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    {plan}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8 border-t border-white/10">
          <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
