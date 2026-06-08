import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { getSessionById } from '../features/sessions/sessionSlice';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

const sanitizeQuestionText = (text) => {
    return text.replace(/^\d+[\s\.)\-]+/, '').trim();
};

const formatIdealAnswer = (text) => {
    try {
        if (!text) return "Pending evaluation.";
        let cleanText = text.trim();
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const parsed = JSON.parse(cleanText);
            if (parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer) {
                return parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer;
            }
            const explanation = parsed.explanation || parsed.understanding || "";
            const code = parsed.code || parsed.codeExample || parsed.example || "";
            if (explanation || code) {
                return `${explanation}\n\n${code}`.trim();
            }
        }
        return text;
    } catch (e) {
        return text;
    }
};

const getScoreColor = (score) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
    return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
};

const getScoreLabel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    return 'Needs Work';
};

function ScorePill({ label, value, colorClass }) {
    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${colorClass.bg} ${colorClass.border}`}>
            <span className="text-[9px] font-bold uppercase text-gray-400 font-mono">{label}</span>
            <span className={`text-sm font-bold font-mono ${colorClass.text}`}>{value}%</span>
        </div>
    );
}

function SessionReview() {
    const { sessionId } = useParams();
    const dispatch = useDispatch();
    const { activeSession, isLoading } = useSelector(state => state.sessions);

    useEffect(() => {
        dispatch(getSessionById(sessionId));
    }, [dispatch, sessionId]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#1B6C42]/20 animate-ping" />
                <div className="relative w-14 h-14 border-2 border-t-[#1B6C42] border-[#1B6C42]/10 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">Generating Analysis...</p>
        </div>
    );

    if (!activeSession || activeSession.status !== 'completed') {
        return (
            <div className="max-w-md mx-auto mt-16 p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl text-center border border-white/50">
                <div className="w-14 h-14 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-2">Report Not Ready</h2>
                <p className="text-gray-500 mb-8 text-sm font-light">This session is still being processed by our AI network. Please check back in a moment.</p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-[#1B6C42] text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-sm hover:bg-[#155A35] transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const { overallScore, metrics, role, level, questions, startTime, endTime } = activeSession;
    const finalMetrics = metrics || {};
    const scoreColors = getScoreColor(overallScore);

    const barData = {
        labels: questions.map((_, i) => `Q${i + 1}`),
        datasets: [{
            label: 'Technical Score',
            data: questions.map(q => q.technicalScore || 0),
            backgroundColor: questions.map(q => (q.technicalScore || 0) >= 70 ? '#10b981' : '#f59e0b'),
            borderRadius: 8,
            borderSkipped: false,
        }],
    };

    const summaryStats = [
        {
            label: 'Overall Result',
            value: `${overallScore}%`,
            sub: getScoreLabel(overallScore),
            highlight: true,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            label: 'Avg Technical',
            value: `${finalMetrics.avgTechnical || 0}%`,
            sub: 'Technical accuracy',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            )
        },
        {
            label: 'Avg Confidence',
            value: `${finalMetrics.avgConfidence || 0}%`,
            sub: 'Communication quality',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )
        },
        {
            label: 'Duration',
            value: formatDuration(startTime, endTime),
            sub: 'Total session time',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 pb-16 space-y-10 animate-in fade-in duration-700">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-200/60 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 bg-[#1B6C42] rounded-full" />
                        <span className="text-[10px] text-[#1B6C42] font-bold uppercase tracking-widest font-mono">Assessment Complete</span>
                    </div>
                    <h1 className="font-playfair text-4xl sm:text-5xl font-semibold text-gray-950 leading-tight">
                        {role}
                        <span className="text-gray-400 font-light text-2xl block sm:inline sm:ml-3">({level})</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Overall Score badge */}
                    <div className={`flex flex-col items-center px-8 py-4 rounded-2xl border-2 ${scoreColors.bg} ${scoreColors.border}`}>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1">Overall Score</span>
                        <span className={`text-4xl font-extrabold font-mono ${scoreColors.text}`}>{overallScore}%</span>
                        <span className={`text-xs font-semibold mt-1 ${scoreColors.text}`}>{getScoreLabel(overallScore)}</span>
                    </div>

                    <Link
                        to="/"
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-semibold transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </Link>
                </div>
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryStats.map((stat, i) => (
                    <div
                        key={i}
                        className={`bg-white/70 backdrop-blur-xl border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${
                            stat.highlight ? 'border-[#1B6C42]/20 border-l-[3px] border-l-[#1B6C42]' : 'border-white/50'
                        }`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${stat.highlight ? 'bg-[#1B6C42]/10 text-[#1B6C42]' : 'bg-gray-100 text-gray-500'}`}>
                            {stat.icon}
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">{stat.label}</p>
                        <p className={`text-2xl sm:text-3xl font-bold font-mono mt-2 leading-none ${stat.highlight ? 'text-[#1B6C42]' : 'text-gray-900'}`}>
                            {stat.value}
                        </p>
                        <p className="text-xs text-gray-400 mt-1.5 font-medium">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Performance Chart */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-[#1B6C42]/10 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#1B6C42]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Per-Question Performance</h3>
                        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-0.5">Technical scores per question</p>
                    </div>
                    <div className="ml-auto flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                            ≥70%
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-amber-400 rounded" />
                            &lt;70%
                        </span>
                    </div>
                </div>
                <div className="h-64 sm:h-72">
                    <Bar
                        data={barData}
                        options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 100,
                                    grid: { color: '#f3f4f6' },
                                    ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#9ca3af' }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#9ca3af' }
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Detailed Q&A Review */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <h3 className="font-playfair text-2xl font-semibold text-gray-950">Answer Intelligence</h3>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-white/50 border border-white/40 px-3 py-1 rounded-full">
                        {questions.length} Questions
                    </span>
                </div>

                <div className="space-y-6">
                    {questions.map((q, index) => {
                        const techColors = getScoreColor(q.technicalScore || 0);
                        const confColors = getScoreColor(q.confidenceScore || 0);
                        return (
                            <div
                                key={index}
                                className="spotlight-card bg-white/75 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                            >
                                <div className="spotlight-content">
                                    {/* Question header */}
                                    <div className="px-6 sm:px-8 py-5 border-b border-gray-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <h4 className="font-playfair text-lg sm:text-xl font-bold text-gray-900 leading-snug flex-1 pr-4">
                                            <span className="text-[#1B6C42] mr-2">Q{index + 1}.</span>
                                            {sanitizeQuestionText(q.questionText)}
                                        </h4>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <ScorePill label="Tech" value={q.technicalScore || 0} colorClass={techColors} />
                                            <ScorePill label="Conf" value={q.confidenceScore || 0} colorClass={confColors} />
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 space-y-6">
                                        {/* User Submission */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono ml-1">Your Submission</label>
                                            <div className="bg-gray-50/80 border border-gray-100 rounded-xl overflow-hidden">
                                                {q.userSubmittedCode && q.userSubmittedCode !== "undefined" && (
                                                    <div className="p-5 border-b border-gray-100 last:border-0">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-3 font-mono">Submitted Code</p>
                                                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto bg-slate-900 text-gray-300 p-4 rounded-xl leading-relaxed">
                                                            {q.userSubmittedCode}
                                                        </pre>
                                                    </div>
                                                )}
                                                {q.userAnswerText && (
                                                    <div className="p-5">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-3 font-mono">Speech Transcript</p>
                                                        <p className="text-sm text-gray-600 italic leading-relaxed font-light">
                                                            "{q.userAnswerText}"
                                                        </p>
                                                    </div>
                                                )}
                                                {(!q.userSubmittedCode || q.userSubmittedCode === "undefined") && !q.userAnswerText && (
                                                    <div className="p-6 text-center text-gray-400 text-xs italic">
                                                        No answer was recorded for this question.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Feedback & Ideal Answer Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono ml-1 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 text-[#1B6C42]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                    AI Feedback
                                                </label>
                                                <div className="bg-[#1B6C42]/5 border-l-[3px] border-[#1B6C42] p-5 rounded-xl text-sm text-gray-700 leading-relaxed font-light italic">
                                                    "{q.aiFeedback}"
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono ml-1 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                    </svg>
                                                    Ideal Implementation
                                                </label>
                                                <pre className="bg-slate-900 text-gray-300 p-5 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed min-h-[80px]">
                                                    {formatIdealAnswer(q.idealAnswer)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Back to Dashboard CTA */}
            <div className="flex justify-center pt-6 pb-8">
                <Link
                    to="/"
                    className="inline-flex items-center gap-3 bg-[#1B6C42] hover:bg-[#155A35] text-white px-8 py-4 rounded-xl font-semibold text-sm shadow-md shadow-[#1B6C42]/20 hover:shadow-lg hover:shadow-[#1B6C42]/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}

export default SessionReview;