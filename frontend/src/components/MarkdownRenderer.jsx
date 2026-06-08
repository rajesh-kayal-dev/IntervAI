import React, { useState } from 'react';

export function formatInline(text) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**'))
      return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>;
    if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2)
      return <em key={i} className="italic">{seg.slice(1, -1)}</em>;
    if (seg.startsWith('`') && seg.endsWith('`'))
      return <code key={i} className="bg-gray-100 text-[#1B6C42] px-1.5 py-0.5 rounded text-[12px] font-mono border border-gray-200">{seg.slice(1, -1)}</code>;
    return seg;
  });
}

export function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#3e3e42] bg-[#1e1e1e] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <span className="text-[10px] font-mono text-[#858585] uppercase tracking-wider">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/5 text-[#858585] hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="text-gray-300 p-4 text-[13px] font-mono overflow-x-auto leading-relaxed">
        {code.trim()}
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ text }) {
  if (!text) return null;
  
  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <p key={`t-${lastIndex}`} className="text-sm leading-relaxed whitespace-pre-wrap mb-2">
          {formatInline(text.slice(lastIndex, match.index))}
        </p>
      );
    }
    const codeStr = match[2];
    const lang = match[1] || 'code';
    parts.push(
      <CodeBlock key={`c-${match.index}`} code={codeStr} lang={lang} />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <p key={`t-${lastIndex}`} className="text-sm leading-relaxed whitespace-pre-wrap">
        {formatInline(text.slice(lastIndex))}
      </p>
    );
  }

  return <div className="space-y-1">{parts}</div>;
}
