// frontend/src/components/IntervBot.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MarkdownRenderer } from './MarkdownRenderer';

const BOT_API = `${import.meta.env.VITE_API_URL}/bot/chat`;

const api = axios.create({ baseURL: BOT_API });
api.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.token) req.headers.Authorization = `Bearer ${user.token}`;
  return req;
});

// ── Bubble messages that cycle ──
const BUBBLE_MESSAGES = [
  "Hey there! 👋 Need help?",
  "Stuck on this question?",
  "I can explain any concept!",
  "Paste your code — I'll review it!",
  "Not sure about the approach?",
  "Ask me anything! 🤖",
  "I'm here to guide you!",
  "Let's crack this together 💡",
];

const SUGGESTED_PROMPTS = [
  "Explain the concept behind this question",
  "What's the optimal approach?",
  "Review my code for improvements",
  "Explain time & space complexity",
  "Give me a hint without the answer",
];

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm **IntervBot** 🤖\n\nI'm your AI interview coach. You can:\n- Paste any question to get an explanation\n- Share your code for a review\n- Ask about algorithms, concepts, complexity\n- Get hints without spoilers!\n\nWhat do you need help with?`,
};

// ── Render markdown with code blocks + copy buttons ──
function MessageContent({ text, isUser }) {
  if (isUser) return <span className="whitespace-pre-wrap text-sm leading-relaxed">{text}</span>;
  return <MarkdownRenderer text={text} />;
}

const TypingDots = () => (
  <div className="flex gap-1.5 items-center px-2 py-1">
    {[0, 150, 300].map((d) => (
      <span
        key={d}
        className="w-2.5 h-2.5 bg-[#1B6C42] rounded-full animate-bounce"
        style={{ animationDelay: `${d}ms`, animationDuration: '0.9s' }}
      />
    ))}
  </div>
);

// ── Inline SVG icons ──
const SendIcon    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>;
const CloseIcon   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
const MinimizeIcon= () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>;
const ClearIcon   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;

// ── Baby Robot mascot (inline SVG for avatar) ──
const RobotAvatar = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#1B6C42"/>
    <line x1="50" y1="12" x2="50" y2="24" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="50" cy="9" r="4" fill="white"/>
    <rect x="26" y="24" width="48" height="38" rx="10" fill="white"/>
    <circle cx="38" cy="41" r="7" fill="#1B6C42"/>
    <circle cx="62" cy="41" r="7" fill="#1B6C42"/>
    <circle cx="40" cy="39" r="2.5" fill="white"/>
    <circle cx="64" cy="39" r="2.5" fill="white"/>
    <path d="M 38 54 Q 50 64 62 54" stroke="#1B6C42" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <rect x="33" y="64" width="34" height="20" rx="8" fill="white" opacity="0.9"/>
    <rect x="70" y="66" width="16" height="7" rx="3.5" fill="white" opacity="0.9"/>
    <rect x="14" y="66" width="16" height="7" rx="3.5" fill="white" opacity="0.9"/>
  </svg>
);

// ── Main component ──
export default function IntervBot({ questionContext = '' }) {
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState([WELCOME_MSG]);
  const [input, setInput]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [bubble, setBubble]         = useState(null);
  const [bubbleIdx, setBubbleIdx]   = useState(0);
  const [hasNew, setHasNew]         = useState(false);

  // Panel size & position (draggable)
  const [panelPos, setPanelPos]     = useState({ x: null, y: null });  // null = use CSS default
  const [panelSize, setPanelSize]   = useState({ w: 520, h: 640 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart                   = useRef(null);
  const resizeStart                 = useRef(null);
  const panelRef                    = useRef(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const bubbleTimerRef = useRef(null);

  // ── Bubble pop-up cycling ──
  useEffect(() => {
    if (isOpen) { setBubble(null); return; }
    const show = () => {
      setBubble(BUBBLE_MESSAGES[bubbleIdx % BUBBLE_MESSAGES.length]);
      setBubbleIdx(i => i + 1);
      setTimeout(() => setBubble(null), 4500);
    };
    const initial = setTimeout(show, 4000);
    bubbleTimerRef.current = setInterval(show, 10000);
    return () => { clearTimeout(initial); clearInterval(bubbleTimerRef.current); };
  }, [isOpen, bubbleIdx]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasNew(false);
      setBubble(null);
    }
  }, [isOpen]);

  // ── Drag panel ──
  const onDragMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('textarea')) return;
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      const { mx, my, px, py } = dragStart.current;
      setPanelPos({ x: px + e.clientX - mx, y: py + e.clientY - my });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging]);

  // ── Resize panel ──
  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: panelSize.w, h: panelSize.h };
    setIsResizing(true);
  }, [panelSize]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      const { mx, my, w, h } = resizeStart.current;
      const newW = Math.max(360, Math.min(900, w + e.clientX - mx));
      const newH = Math.max(400, Math.min(window.innerHeight - 120, h + e.clientY - my));
      setPanelSize({ w: newW, h: newH });
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  // ── Send message ──
  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const history = [...messages, userMsg]
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const { data } = await api.post('', { messages: history, context: questionContext });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.reply }]);
      if (!isOpen) setHasNew(true);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: '⚠️ **Connection error.** The AI service may not be running.\n\nMake sure the Python AI service at `http://127.0.0.1:8000` is started, then try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Panel position style
  const panelStyle = {
    width: panelSize.w,
    height: panelSize.h,
    cursor: isDragging ? 'grabbing' : 'auto',
    userSelect: isDragging ? 'none' : 'auto',
  };
  if (panelPos.x !== null) {
    panelStyle.left  = panelPos.x;
    panelStyle.top   = panelPos.y;
    panelStyle.bottom = 'auto';
  } else {
    panelStyle.left   = 16;
    panelStyle.bottom = 110;
  }

  return (
    <>
      <style>{`
        @keyframes botFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes waveHand {
          0%,100% { transform: rotate(-15deg); }
          50%     { transform: rotate(18deg);  }
        }
        @keyframes bubblePop {
          0%  { opacity:0; transform:scale(0.85) translateY(8px); }
          12% { opacity:1; transform:scale(1)    translateY(0);   }
          85% { opacity:1; transform:scale(1)    translateY(0);   }
          100%{ opacity:0; transform:scale(0.95) translateY(-4px);}
        }
        .bot-float  { animation: botFloat 2.4s ease-in-out infinite; }
        .bubble-pop { animation: bubblePop 4.5s ease forwards; }
      `}</style>

      {/* ═══════ FLOATING ROBOT BUTTON (bottom-left) ═══════ */}
      <div className="fixed bottom-4 left-4 z-[160] flex flex-col items-start gap-2 select-none">

        {/* Pop-up speech bubble */}
        {bubble && !isOpen && (
          <div className="bubble-pop ml-2">
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl rounded-bl-none px-4 py-3 max-w-[220px] relative">
              <p className="text-sm font-medium text-gray-700 leading-snug">{bubble}</p>
              {/* Triangle */}
              <div className="absolute -bottom-2.5 left-4 w-0 h-0"
                style={{ borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:'10px solid white', filter:'drop-shadow(0 2px 2px rgba(0,0,0,0.08))' }}
              />
            </div>
          </div>
        )}

        {/* New-reply badge */}
        {hasNew && !isOpen && (
          <div className="bubble-pop ml-2">
            <div className="bg-[#1B6C42] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
              New reply!
            </div>
          </div>
        )}

        {/* Robot button */}
        <button
          onClick={() => setIsOpen(o => !o)}
          className="focus:outline-none"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          title="IntervBot – Your AI Interview Coach"
        >
          <div className={!isOpen ? 'bot-float' : ''} style={{ position:'relative', width:60, height:60 }}>
            {isOpen ? (
              <div className="w-[60px] h-[60px] bg-[#1B6C42] hover:bg-[#155A35] rounded-full flex items-center justify-center shadow-xl shadow-[#1B6C42]/40 transition-colors">
                <CloseIcon />
              </div>
            ) : (
              <div style={{ position:'relative', width:60, height:60 }}>
                <img
                  src="/intervbot_mascot.png"
                  alt="IntervBot"
                  className="w-[60px] h-[60px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                  style={{ borderRadius:'50%' }}
                  onError={(e) => { e.target.style.display='none'; }}
                />
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm animate-pulse"/>
                {hasNew && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-ping"/>}
              </div>
            )}
          </div>
          <div className="mt-1.5 text-center">
            <span className="text-[11px] font-bold text-[#1B6C42] uppercase tracking-widest font-mono drop-shadow-sm">
              IntervBot
            </span>
          </div>
        </button>
      </div>

      {/* ═══════ LARGE CHAT PANEL ═══════ */}
      <div
        ref={panelRef}
        className={`fixed z-[159] flex flex-col bg-white rounded-2xl border border-gray-200 transition-all duration-300 origin-bottom-left ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none'
        } ${isResizing ? '' : 'transition-[opacity,transform]'}`}
        style={{
          ...panelStyle,
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Drag handle / Header ── */}
        <div
          onMouseDown={onDragMouseDown}
          className="flex-shrink-0 flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#1B6C42] to-[#22874f] rounded-t-2xl select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Robot avatar */}
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
            <RobotAvatar size={40} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">IntervBot</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"/>
              <p className="text-white/70 text-[11px] font-mono">AI Interview Coach · Online</p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setMessages([WELCOME_MSG]); setInput(''); }}
              title="Clear chat"
              className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-xl transition-all"
            >
              <ClearIcon />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              title="Close"
              className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-xl transition-all"
            >
              <MinimizeIcon />
            </button>
          </div>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50/40" style={{ minHeight: 0 }}>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Avatar */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center mt-0.5 ${
                msg.role === 'user' ? 'bg-[#1B6C42]/10 border border-[#1B6C42]/15' : ''
              }`}>
                {msg.role === 'user' ? (
                  <svg className="w-4 h-4 text-[#1B6C42]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                ) : (
                  <RobotAvatar size={36} />
                )}
              </div>

              {/* Message bubble */}
              <div className={`max-w-[78%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-[#1B6C42] text-white rounded-tr-sm'
                    : 'bg-white border border-gray-150 text-gray-800 rounded-tl-sm shadow-sm'
                }`}
                style={{ wordBreak: 'break-word' }}
                >
                  <MessageContent text={msg.content} isUser={msg.role === 'user'} />
                </div>

                {/* Copy button for assistant messages */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <CopyTextButton text={msg.content} />
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                <RobotAvatar size={36} />
              </div>
              <div className="bg-white border border-gray-150 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Quick prompt chips ── */}
        {messages.length === 1 && !isLoading && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2.5">Quick prompts</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs font-medium text-[#1B6C42] bg-[#1B6C42]/6 hover:bg-[#1B6C42]/12 border border-[#1B6C42]/20 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ── */}
        <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white rounded-b-2xl">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 focus-within:border-[#1B6C42] focus-within:ring-2 focus-within:ring-[#1B6C42]/15 rounded-xl transition-all px-4 py-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder="Ask me anything or paste your code here…"
              rows={2}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none disabled:opacity-50 leading-relaxed font-normal"
              style={{ minHeight: '48px', maxHeight: '160px', overflowY: 'auto' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-10 h-10 bg-[#1B6C42] hover:bg-[#155A35] disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-mono flex items-center justify-between">
            <span>↵ Send · Shift+↵ New line</span>
            <span className="text-gray-300">Drag header to move · ↘ corner to resize</span>
          </p>
        </div>

        {/* ── Resize handle (bottom-right corner) ── */}
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pb-1 pr-1 opacity-40 hover:opacity-80 transition-opacity"
          title="Drag to resize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 6L6 11M11 11" stroke="#1B6C42" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </>
  );
}

// ── Inline copy-full-message button ──
function CopyTextButton({ text }) {
  const [copied, setCopied] = useState(false);
  const plainText = text.replace(/```[\w]*\n?/g, '').replace(/\*\*/g, '').replace(/`/g, '');

  const copy = () => {
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={copy}
      className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all ${
        copied ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Copy response
        </>
      )}
    </button>
  );
}
