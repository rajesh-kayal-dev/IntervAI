const SessionCard = ({ session, onClick, onDelete }) => {

    const isDeletable = session.status !== 'pending';
    const getIcon = () => {
        const r = session.role;
        const className = "w-5 h-5";

        // Python, Java, Backend, Mobile, Game
        if (r.includes('Python') || r.includes('Java') || r.includes('Backend') || r.includes('MERN') || r.includes('MEAN') || r.includes('React') || r.includes('Frontend') || r.includes('Mobile') || r.includes('Game')) {
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
            );
        }
        // Data Scientist, Machine Learning, AI, Analyst
        if (r.includes('Data') || r.includes('Machine') || r.includes('AI') || r.includes('Analyst')) {
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            );
        }
        // Cloud, DevOps
        if (r.includes('DevOps') || r.includes('Cloud') || r.includes('SRE')) {
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
            );
        }
        // Security
        if (r.includes('Security') || r.includes('Cyber')) {
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
                </svg>
            );
        }
        // Default / Designer / QA / PM
        return (
            <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
        );
    };
    const statusColor = session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : session.status === 'in-progress' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-700';

    const iconBg = session.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600';

    const scoreColor = session.status === 'completed' ? (session.overallScore > 75 ? ' text-emerald-500' : 'text-orange-500') : 'text-slate-300';

    return (
        <div 
            onClick={() => onClick(session)} 
            className='spotlight-card group bg-white/70 backdrop-blur-xl border border-white/45 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 transition-all duration-[400ms] hover:border-[#1B6C42]/30 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(27,108,66,0.04)] cursor-pointer'
        >
            <div className='spotlight-content flex flex-col md:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto flex-grow'>
                <div className='flex items-center gap-4 sm:gap-6 w-full md:w-auto flex-grow'>
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-sm ${iconBg}`}>{getIcon()}</div>
                    <div className='overflow-hidden'>
                        <h3 className='font-semibold text-gray-950 text-base sm:text-lg truncate group-hover:text-[#1B6C42] transition-colors'>{session.role}</h3>
                        <div className='flex items-center gap-2 text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider font-mono'>
                            <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className='text-gray-600 bg-gray-100 px-2 py-0.5 rounded'>{session.level}</span>
                        </div>
                    </div>
                </div>

                <div className='flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-gray-100 md:border-t-0 pt-4 md:pt-0'>
                    <div className='text-left md:text-center bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2 min-w-[80px]'>
                        <p className='text-[8px] font-bold text-gray-400 uppercase tracking-widest font-mono leading-none'>Score</p>
                        <p className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${scoreColor}`}>
                            {session.status === 'completed' ? `${session.overallScore}%` : '--'}
                        </p>
                    </div>

                    <div className='flex flex-col items-end gap-1.5'>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${statusColor}`}>{session.status}</span>
                        <span className='text-[#1B6C42] font-semibold text-xs flex items-center group-hover:translate-x-0.5 transition-transform'>{session.status === 'completed' ? 'Results' : 'Resume'}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </span>
                    </div>
                </div>

                <div className='hidden md:block w-[1px] h-10 bg-gray-200 mx-2'></div>

                <button 
                    onClick={(e) => { e.stopPropagation(); if (isDeletable) onDelete(e, session._id) }} 
                    className='p-2.5 text-gray-300 hover:text-rose-600 hover:bg-rose-100/50 rounded-xl transition-all duration-300' 
                    title='Delete Session'
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default SessionCard
