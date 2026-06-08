// frontend/src/pages/InterviewRunner.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, submitAnswer, endSession } from '../features/sessions/sessionSlice';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import IntervBot from '../components/IntervBot';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import axios from 'axios';

// ─────────────────────────────────────────────
//  Language config
// ─────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python',     value: 'python'     },
  { label: 'Java',       value: 'java'       },
  { label: 'C++',        value: 'cpp'        },
  { label: 'C#',         value: 'csharp'     },
  { label: 'Go',         value: 'go'         },
  { label: 'Swift',      value: 'swift'      },
  { label: 'Kotlin',     value: 'kotlin'     },
  { label: 'R Language', value: 'r'          },
  { label: 'SQL',        value: 'sql'        },
  { label: 'HTML',       value: 'html'       },
  { label: 'CSS',        value: 'css'        },
  { label: 'Solidity',   value: 'solidity'   },
  { label: 'Shell',      value: 'shell'      },
  { label: 'YAML',       value: 'yaml'       },
  { label: 'Markdown',   value: 'markdown'   },
  { label: 'Plain Text', value: 'plaintext'  },
];

const ROLE_LANGUAGE_MAP = {
  "MERN Stack Developer":         "javascript",
  "MEAN Stack Developer":         "typescript",
  "Full Stack Python":            "python",
  "Full Stack Java":              "java",
  "Frontend Developer":           "javascript",
  "Backend Developer":            "javascript",
  "Data Scientist":               "python",
  "Data Analyst":                 "python",
  "Machine Learning Engineer":    "python",
  "DevOps Engineer":              "shell",
  "Cloud Engineer (AWS/Azure/GCP)": "yaml",
  "Cybersecurity Engineer":       "python",
  "Blockchain Developer":         "solidity",
  "Mobile Developer (iOS/Android)": "swift",
  "Game Developer":               "csharp",
  "QA Automation Engineer":       "python",
  "UI/UX Designer":               "css",
  "Product Manager":              "markdown",
};

// ─────────────────────────────────────────────
//  Boilerplate templates (keyed by language)
//  {QUESTION} is replaced with the question text at runtime
// ─────────────────────────────────────────────
const BOILERPLATE = {
  javascript: (q) => `/**
 * Problem: ${q}
 *
 * @param {*} input
 * @return {*}
 */
function solution(input) {
  // ✏️  Implement your solution here


}`,

  typescript: (q) => `/**
 * Problem: ${q}
 */
function solution(input: unknown): unknown {
  // ✏️  Implement your solution here


}`,

  python: (q) => `# Problem: ${q}

def solution(input):
    """
    Implement your solution here.
    """
    # ✏️  Your code below
    pass
`,

  java: (q) => `// Problem: ${q}

class Solution {
    public Object solution(Object input) {
        // ✏️  Implement your solution here

        return null;
    }
}`,

  cpp: (q) => `// Problem: ${q}
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // ✏️  Implement your solution here
    auto solution(auto input) {

    }
};`,

  csharp: (q) => `// Problem: ${q}
using System;

public class Solution {
    public object Solve(object input) {
        // ✏️  Implement your solution here

        return null;
    }
}`,

  go: (q) => `// Problem: ${q}
package main

import "fmt"

// solution implements the answer
func solution(input interface{}) interface{} {
	// ✏️  Implement your solution here

	return nil
}

func main() {
	result := solution(nil)
	fmt.Println(result)
}`,

  swift: (q) => `// Problem: ${q}

func solution(_ input: Any?) -> Any? {
    // ✏️  Implement your solution here

    return nil
}`,

  kotlin: (q) => `// Problem: ${q}

fun solution(input: Any?): Any? {
    // ✏️  Implement your solution here

    return null
}`,

  r: (q) => `# Problem: ${q}

solution <- function(input) {
  # ✏️  Implement your solution here

}`,

  sql: (q) => `-- Problem: ${q}

-- Write your SQL query below
SELECT *
FROM your_table
WHERE 1=1
  -- ✏️  Add your conditions here
;`,

  html: (q) => `<!-- Problem: ${q} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Solution</title>
  <style>
    /* ✏️  Your styles here */
  </style>
</head>
<body>
  <!-- ✏️  Your HTML here -->

  <script>
    // ✏️  Your JavaScript here
  </script>
</body>
</html>`,

  css: (q) => `/* Problem: ${q} */

/* ✏️  Write your CSS solution below */
.solution {
  /* your styles */
}`,

  solidity: (q) => `// Problem: ${q}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Solution {
    // ✏️  Implement your solution here

    function solve() public {

    }
}`,

  shell: (q) => `#!/bin/bash
# Problem: ${q}

# ✏️  Implement your solution here

main() {
  echo "Solution"
}

main "$@"`,

  yaml: (q) => `# Problem: ${q}

# ✏️  Write your YAML solution below
solution:
  description: "Your answer here"
  steps:
    - step: 1
      action: "Define your approach"
`,

  markdown: (q) => `# Solution

**Problem:** ${q}

## Approach

✏️  Describe your approach here.

## Steps

1. Step one
2. Step two
3. Step three

## Conclusion

Your conclusion here.
`,

  plaintext: (q) => `Problem: ${q}

✏️  Write your answer below:

`,
};

// Generate boilerplate for a given language and question
function getBoilerplate(language, questionText = '') {
  const clean = questionText.trim().replace(/\n+/g, ' ').substring(0, 120);
  const gen = BOILERPLATE[language];
  return gen ? gen(clean) : `// Problem: ${clean}\n\n// ✏️  Your solution here\n`;
}

// ─────────────────────────────────────────────
//  Icon components
// ─────────────────────────────────────────────
const MicIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const WarnIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5C2.299 18.333 3.262 20 4.8 20z" />
  </svg>
);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
function InterviewRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeSession, isLoading, message } = useSelector(state => state.sessions);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [editorMode, setEditorMode] = useState('code'); // 'code' or 'text'
  const [submittedLocal, setSubmittedLocal] = useState({});
  const [drafts, setDrafts] = useState(() => {
    const saved = localStorage.getItem(`drafts_${sessionId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [isRecording, setIsRecording]     = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [leftTab, setLeftTab]             = useState('question');
  const [syntaxErrors, setSyntaxErrors]   = useState([]);  // monaco marker errors
  const [isGenerating, setIsGenerating]   = useState(false); // AI generate button state
  const [hintsLocal, setHintsLocal]       = useState({});
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  // Monaco refs for syntax checking
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const streamRef         = useRef(null);
  const timerIntervalRef  = useRef(null);

  // Set language from role on load
  useEffect(() => {
    if (activeSession?.role) {
      setSelectedLanguage(ROLE_LANGUAGE_MAP[activeSession.role] || "javascript");
    }
  }, [activeSession?.role]);

  // Persist drafts
  useEffect(() => {
    localStorage.setItem(`drafts_${sessionId}`, JSON.stringify(drafts));
  }, [drafts, sessionId]);

  // Fetch session
  useEffect(() => {
    dispatch(getSessionById(sessionId));
  }, [dispatch, sessionId]);

  // ── Auto-populate boilerplate when question or language changes ──
  useEffect(() => {
    if (!activeSession) return;
    const q = activeSession.questions?.[currentQuestionIndex];
    if (!q) return;

    setDrafts(prev => {
      const existing = prev[currentQuestionIndex];
      // Only inject boilerplate if there's no user code yet for this question
      if (existing?.code && existing.code.trim() !== '') return prev;
      return {
        ...prev,
        [currentQuestionIndex]: {
          textAnswer: '',
          ...existing,
          code: existing?.code || getBoilerplate(selectedLanguage, q.questionText),
          mode: existing?.mode || 'code'
        },
      };
    });
    // Clear syntax errors on question change
    setSyntaxErrors([]);
  }, [currentQuestionIndex, selectedLanguage, activeSession]);

  // Sync local editorMode state when draft changes
  useEffect(() => {
    const draftMode = drafts[currentQuestionIndex]?.mode || 'code';
    setEditorMode(draftMode);
  }, [currentQuestionIndex, drafts]);

  // Switch left tab automatically on evaluation
  useEffect(() => {
    const q = activeSession?.questions?.[currentQuestionIndex];
    if (q?.isEvaluated) setLeftTab('feedback');
    else setLeftTab('question');
  }, [currentQuestionIndex, activeSession]);

  const currentQuestion    = activeSession?.questions?.[currentQuestionIndex];
  const isReduxSubmitted   = currentQuestion?.isSubmitted === true;
  const isLocallySubmitted = submittedLocal[currentQuestionIndex] === true;
  const isQuestionLocked   = isReduxSubmitted || isLocallySubmitted;
  const isProcessing       = isQuestionLocked && !currentQuestion?.isEvaluated;

  // ── Language change: regenerate boilerplate ──
  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    // Reset code draft for current question to new boilerplate
    const q = activeSession?.questions?.[currentQuestionIndex];
    setDrafts(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        ...prev[currentQuestionIndex],
        code: getBoilerplate(newLang, q?.questionText || ''),
      },
    }));
    setSyntaxErrors([]);
  };

  const handleNavigation = (index) => {
    if (index >= 0 && index < activeSession?.questions.length) {
      if (isRecording) stopRecording();
      setCurrentQuestionIndex(index);
      setRecordingTime(0);
    }
  };

  const handleModeToggle = (mode) => {
    setEditorMode(mode);
    setDrafts(prev => ({
      ...prev,
      [currentQuestionIndex]: { ...prev[currentQuestionIndex], mode }
    }));
  };

  const updateDraftCode = useCallback((newValue) => {
    setDrafts(prev => {
      const isText = editorMode === 'text';
      return {
        ...prev,
        [currentQuestionIndex]: { 
          ...prev[currentQuestionIndex], 
          [isText ? 'textAnswer' : 'code']: newValue 
        },
      };
    });
  }, [currentQuestionIndex, editorMode]);

  // ── Ghost text setup ──
  const idealAnswerRef = useRef('');
  useEffect(() => {
    const text = activeSession?.questions?.[currentQuestionIndex]?.idealAnswer || '';
    const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    idealAnswerRef.current = match ? match[1].trim() : text.replace(/\*\*/g, '').trim();
  }, [currentQuestionIndex, activeSession]);

  // ── Monaco editor mount handler ──
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    // Listen to model marker changes (syntax errors)
    monaco.editor.onDidChangeMarkers(() => {
      const model   = editor.getModel();
      if (!model) return;
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const errors  = markers.filter(m => m.severity === monaco.MarkerSeverity.Error);
      setSyntaxErrors(errors);
    });

    // Register Inline Completions Provider for Ghost Text
    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: function(model, position) {
        const ideal = idealAnswerRef.current;
        if (!ideal) return { items: [] };

        // Only suggest if they are at the end of a line or document to avoid annoyance
        const lineContent = model.getLineContent(position.lineNumber);
        if (position.column <= lineContent.length) return { items: [] };

        return {
          items: [{
            insertText: ideal,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
          }]
        };
      },
      freeInlineCompletions: function() {}
    });
  };

  // ── Toolbar Actions (Reset, Generate, Share) ──
  const handleReset = () => {
    if (isQuestionLocked) return;
    const q = activeSession?.questions?.[currentQuestionIndex];
    if (window.confirm("Reset code to boilerplate? Your current code will be lost.")) {
      updateDraftCode(getBoilerplate(selectedLanguage, q?.questionText || ''));
    }
  };

  const handleGenerate = async () => {
    if (isQuestionLocked || isGenerating) return;
    const q = activeSession?.questions?.[currentQuestionIndex];
    if (!q) return;

    setIsGenerating(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = user?.token;
      
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/bot/chat`,
        {
          messages: [{ role: 'user', content: `Please provide a clean, optimal code solution in ${selectedLanguage} for this question. Output ONLY code, no explanations.` }],
          context: q.questionText
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Extract code block if AI wraps it
      const match = data.reply.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const pureCode = match ? match[1].trim() : data.reply.trim();
      updateDraftCode(pureCode);
      toast.success("AI generated a solution!");
    } catch (err) {
      toast.error("Failed to generate code from AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchHints = async () => {
    const q = activeSession?.questions?.[currentQuestionIndex];
    if (!q || isLoadingHints) return;
    
    setIsLoadingHints(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = user?.token;
      
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/bot/chat`,
        {
          messages: [{ role: 'user', content: `Please provide LeetCode style hints and a short conceptual guide on how to approach and solve this interview question. Break it into clear sections (e.g., 'Guide', 'Hints'). Do NOT provide the exact code answer.` }],
          context: q.questionText
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setHintsLocal(prev => ({
        ...prev,
        [currentQuestionIndex]: data.reply
      }));
    } catch (err) {
      toast.error("Failed to load hints from AI.");
    } finally {
      setIsLoadingHints(false);
    }
  };

  const handleShare = async () => {
    const q = activeSession?.questions?.[currentQuestionIndex];
    if (!q) return;
    
    const text = `Hey, check out this interview question: "${q.questionText}"`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Interview Question',
          text: text,
          url: window.location.href,
        });
      } catch (e) {
        // user cancelled or error
      }
    } else {
      // Fallback: WhatsApp link
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`;
      window.open(waUrl, '_blank');
    }
  };

  // ── Validate then submit ──
  const validateAndSubmit = async () => {
    if (isQuestionLocked) return;
    if (isRecording) stopRecording();

    const draft = drafts[currentQuestionIndex];
    const isTextMode = editorMode === 'text';
    const submittedContent = isTextMode ? (draft?.textAnswer || '') : (draft?.code || '');
    const audio = draft?.audioBlob;

    // 1. Must have something
    if (!submittedContent.trim() && !audio) {
      toast.warning("Please write an answer or record a verbal explanation before submitting.");
      return;
    }

    // 2. Check for syntax errors only if in code mode
    if (!isTextMode && syntaxErrors.length > 0) {
      const firstError = syntaxErrors[0];
      toast.error(
        `❌ Syntax Error on line ${firstError.startLineNumber}: ${firstError.message}`,
        { autoClose: 6000 }
      );
      // Jump cursor to the error line
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(firstError.startLineNumber);
        editorRef.current.setPosition({
          lineNumber: firstError.startLineNumber,
          column: firstError.startColumn,
        });
        editorRef.current.focus();
      }
      return;
    }

    // 3. Check if code is only the boilerplate stub (user didn't write anything)
    const boilerplate = getBoilerplate(selectedLanguage, currentQuestion?.questionText || '');
    const userCode    = code.trim();
    const stubCode    = boilerplate.trim();
    if (userCode === stubCode) {
      toast.warning("Please implement the function body before submitting!");
      return;
    }

    // 4. All good — submit
    setSubmittedLocal(prev => ({ ...prev, [currentQuestionIndex]: true }));

    const formData = new FormData();
    formData.append('questionIndex', currentQuestionIndex);
    formData.append('code', submittedContent);
    formData.append('language', selectedLanguage);
    if (audio) {
      formData.append('audio', audio, `q${currentQuestionIndex}.webm`);
    } 
    dispatch(submitAnswer({ sessionId, formData }))
      .unwrap()
      .catch(() => {
        setSubmittedLocal(prev => ({ ...prev, [currentQuestionIndex]: false }));
        toast.error("Submission failed. Please try again.");
      });
  };

  // ── Recording ──
  const startRecording = async () => {
    if (isQuestionLocked) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current         = stream;
      mediaRecorderRef.current  = new MediaRecorder(stream);
      audioChunksRef.current    = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setDrafts(prev => ({
          ...prev,
          [currentQuestionIndex]: { ...prev[currentQuestionIndex], audioBlob: blob },
        }));
      };
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      clearInterval(timerIntervalRef.current);
      setIsRecording(false);
    }
  };

  // ── Finish session ──
  const handleFinishInterview = () => {
    dispatch(endSession(sessionId))
      .unwrap()
      .then(() => {
        localStorage.removeItem(`drafts_${sessionId}`);
        navigate(`/review/${sessionId}`);
      })
      .catch(() => toast.error("Could not finish session. AI is still working on it."));
    setShowFinishConfirm(false);
  };

  // ── Loading state ──
  if (!activeSession) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-[#1B6C42]/20 animate-ping" />
          <div className="relative w-14 h-14 border-2 border-t-[#1B6C42] border-[#1B6C42]/10 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">Loading session...</p>
      </div>
    </div>
  );

  const currentDraft    = drafts[currentQuestionIndex] || {};
  const totalQuestions  = activeSession?.questions?.length || 0;
  const answeredCount   = activeSession?.questions?.filter((q, i) => q.isSubmitted || submittedLocal[i]).length || 0;
  const progress        = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const lineCount       = (currentDraft.code || '').split('\n').length;
  const hasErrors       = syntaxErrors.length > 0 && !isQuestionLocked;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">

      {/* ══════════ TOP NAV ══════════ */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 px-4 sm:px-6 flex items-center justify-between gap-3 h-14">

        {/* Session info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-widest hidden sm:block">Live</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="font-semibold text-gray-900 text-sm truncate max-w-[160px] sm:max-w-xs">{activeSession.role}</h1>
          <span className="hidden md:block text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
            {activeSession.level}
          </span>
        </div>

        {/* Question pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeSession?.questions?.map((q, i) => (
            <button
              key={i}
              onClick={() => handleNavigation(i)}
              title={`Question ${i + 1}`}
              className={`w-7 h-7 rounded-md text-[10px] font-bold font-mono transition-all duration-200 ${
                i === currentQuestionIndex
                  ? 'bg-[#1B6C42] text-white shadow-sm scale-105'
                  : q.isEvaluated
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : (q.isSubmitted || submittedLocal[i])
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Progress + Finish */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-gray-400">
            <span className="font-bold text-gray-700">{answeredCount}</span>/{totalQuestions}
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1B6C42] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            onClick={() => setShowFinishConfirm(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{isLoading ? "Finalizing..." : "Finish"}</span>
          </button>
        </div>
      </div>

      {/* ══════════ MAIN SPLIT PANE ══════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL – Question / Feedback ── */}
        <div className="w-full lg:w-[40%] xl:w-[36%] flex flex-col border-r border-gray-200/70 bg-white overflow-hidden flex-shrink-0">

          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-100 bg-gray-50/80 px-4 flex-shrink-0">
            <button
              onClick={() => setLeftTab('question')}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                leftTab === 'question' ? 'border-[#1B6C42] text-[#1B6C42]' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              Question
            </button>
            {currentQuestion?.isEvaluated && (
              <button
                onClick={() => setLeftTab('feedback')}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
                  leftTab === 'feedback' ? 'border-[#1B6C42] text-[#1B6C42]' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Feedback
              </button>
            )}
            {isProcessing && (
              <div className="ml-auto flex items-center gap-1.5 text-[9px] font-mono text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full mr-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                Evaluating...
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {leftTab === 'question' ? (
              <div className="p-6">
                {/* Status badges */}
                <div className="flex items-center flex-wrap gap-2 mb-5">
                  <span className="bg-[#1B6C42] text-white text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg">
                    Q{currentQuestionIndex + 1} / {totalQuestions}
                  </span>
                  {isQuestionLocked && !currentQuestion?.isEvaluated && (
                    <span className="bg-amber-100 text-amber-600 text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                      AI Analyzing
                    </span>
                  )}
                  {currentQuestion?.isEvaluated && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" />
                      Evaluated
                    </span>
                  )}
                </div>

                {/* Question text */}
                <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-gray-950 leading-relaxed mb-6">
                  {currentQuestion?.questionText}
                </h2>

                {/* Guide & Hints */}
                <div className="border-t border-gray-100 pt-5 space-y-3 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Guide & Hints</p>
                    {!hintsLocal[currentQuestionIndex] && (
                      <button
                        onClick={fetchHints}
                        disabled={isLoadingHints}
                        className="text-[10px] font-bold text-[#1B6C42] bg-[#1B6C42]/10 hover:bg-[#1B6C42]/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isLoadingHints ? (
                          <span className="w-3 h-3 border-2 border-[#1B6C42]/30 border-t-[#1B6C42] rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {isLoadingHints ? "Generating..." : "Get AI Hints"}
                      </button>
                    )}
                  </div>

                  {hintsLocal[currentQuestionIndex] ? (
                    <div className="text-gray-800 bg-[#1B6C42]/5 p-5 rounded-xl border border-[#1B6C42]/10 overflow-hidden">
                      <MarkdownRenderer text={hintsLocal[currentQuestionIndex]} />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-light italic bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.496 1.509 1.333 1.509 2.316V18" />
                      </svg>
                      Click the button above to generate a LeetCode-style guide and hints if you get stuck!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex gap-2 flex-wrap">
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${(currentQuestion?.technicalScore || 0) >= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    <span className="text-[9px] font-bold uppercase text-gray-400 font-mono">Technical</span>
                    <span className="text-sm font-bold font-mono">{currentQuestion?.technicalScore || 0}%</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${(currentQuestion?.confidenceScore || 0) >= 70 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    <span className="text-[9px] font-bold uppercase text-gray-400 font-mono">Confidence</span>
                    <span className="text-sm font-bold font-mono">{currentQuestion?.confidenceScore || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">AI Feedback</p>
                  <div className="bg-[#1B6C42]/5 border-l-[3px] border-[#1B6C42] p-4 rounded-r-xl text-sm text-gray-700 leading-relaxed font-light italic">
                    "{currentQuestion?.aiFeedback}"
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Ideal Implementation</p>
                  <pre className="bg-slate-900 text-gray-300 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {currentQuestion?.idealAnswer || "No ideal answer provided."}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next navigation */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/60">
            <button
              onClick={() => handleNavigation(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <span className="text-[10px] font-mono text-gray-400 font-bold">{currentQuestionIndex + 1} of {totalQuestions}</span>
            <button
              onClick={() => handleNavigation(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === totalQuestions - 1}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL – Code Editor ── */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden min-w-0">

          {/* Editor toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#3e3e42]">

            {/* Left: traffic lights + file name */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[11px] font-semibold text-[#858585] font-mono ml-1">solution</span>
              {/* Syntax error indicator */}
              {hasErrors && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-900/20 border border-rose-500/20 px-2 py-0.5 rounded">
                  <WarnIcon className="w-3 h-3" />
                  {syntaxErrors.length} error{syntaxErrors.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Right: mic + language selector */}
            <div className="flex items-center gap-2">
              {/* Mic controls */}
              {!isRecording && !currentDraft.audioBlob && !isQuestionLocked && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-[#858585] hover:text-white bg-[#3e3e42] hover:bg-[#505050] px-3 py-1.5 rounded-md transition-all"
                >
                  <MicIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">Add Voice</span>
                </button>
              )}
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-rose-400 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 px-3 py-1.5 rounded-md transition-all animate-pulse"
                >
                  <StopIcon className="w-3.5 h-3.5" />
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                </button>
              )}
              {currentDraft.audioBlob && !isRecording && !isQuestionLocked && (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-900/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-md">
                    <CheckIcon className="w-3 h-3" />
                    Voice Ready
                  </span>
                  <button
                    onClick={() => setDrafts(prev => ({ ...prev, [currentQuestionIndex]: { ...prev[currentQuestionIndex], audioBlob: null } }))}
                    className="text-[#858585] hover:text-rose-400 transition-colors p-1"
                    title="Delete recording"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {currentDraft.audioBlob && isQuestionLocked && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-900/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-md">
                  <CheckIcon className="w-3 h-3" />
                  Voice Submitted
                </span>
              )}

              <div className="w-px h-4 bg-[#3e3e42]" />

              {/* Editor Mode Toggle */}
              <div className="flex items-center bg-[#1e1e1e] rounded-md p-0.5 border border-[#505050]">
                <button
                  onClick={() => handleModeToggle('code')}
                  className={`px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded-sm transition-all ${
                    editorMode === 'code' ? 'bg-[#3e3e42] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => handleModeToggle('text')}
                  className={`px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded-sm transition-all ${
                    editorMode === 'text' ? 'bg-[#3e3e42] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  Text
                </button>
              </div>

              <div className="w-px h-4 bg-[#3e3e42]" />

              {/* Toolbar Actions */}
              {!isQuestionLocked && (
                <>
                  <button
                    onClick={handleReset}
                    title="Reset to boilerplate"
                    className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-[#858585] hover:text-white bg-[#3e3e42] hover:bg-[#505050] px-2.5 py-1.5 rounded-md transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden xl:block">Reset</span>
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    title="AI Auto-Solve"
                    className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 px-2.5 py-1.5 rounded-md transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span className="hidden xl:block">Generate</span>
                  </button>
                </>
              )}

              <button
                onClick={handleShare}
                title="Share question"
                className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-[#858585] hover:text-white bg-[#3e3e42] hover:bg-[#505050] px-2.5 py-1.5 rounded-md transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden xl:block">Share</span>
              </button>

              <div className="w-px h-4 bg-[#3e3e42]" />

              {/* Language selector - only show in code mode */}
              {editorMode === 'code' && (
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={isQuestionLocked}
                  className="text-[11px] bg-[#3e3e42] border border-[#505050] text-[#cccccc] rounded-md px-2.5 py-1.5 font-mono cursor-pointer disabled:opacity-50 outline-none focus:border-[#1B6C42] transition-colors appearance-none"
                >
                  {SUPPORTED_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Monaco editor – fills all remaining height */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={editorMode === 'text' ? 'markdown' : selectedLanguage}
              theme="vs-dark"
              value={editorMode === 'text' ? (currentDraft.textAnswer || '') : (currentDraft.code || '')}
              onChange={updateDraftCode}
              onMount={handleEditorDidMount}
              options={{
                minimap:              { enabled: editorMode === 'code' },
                fontSize:             editorMode === 'text' ? 16 : 14,
                lineHeight:           editorMode === 'text' ? 28 : 24,
                scrollBeyondLastLine: false,
                readOnly:             false, // unlocked so user can test ghost text
                inlineSuggest:        { enabled: true },
                domReadOnly:          isQuestionLocked,
                padding:              { top: 16, bottom: 16, left: editorMode === 'text' ? 16 : 0 },
                fontFamily:           editorMode === 'text' ? "Inter, system-ui, sans-serif" : "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures:        true,
                wordWrap:             editorMode === 'text' ? 'on' : 'off',
                lineNumbers:          editorMode === 'text' ? 'off' : 'on',
                glyphMargin:          editorMode === 'code',
                folding:              editorMode === 'code',
                renderLineHighlight:  editorMode === 'code' ? 'all' : 'none',
                matchBrackets:        editorMode === 'code' ? 'always' : 'never',
                tabSize:              2,
                automaticLayout:      true,
                quickSuggestions:     true,
                suggestOnTriggerCharacters: true,
                formatOnType:         true,
                formatOnPaste:        true,
                bracketPairColorization: { enabled: true },
                scrollbar: {
                  verticalScrollbarSize:   8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          </div>

          {/* Submit bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#252526] border-t border-[#3e3e42] gap-3">
            {/* Left: error summary or processing state */}
            <div className="flex items-center gap-3 min-w-0">
              {hasErrors && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400 truncate">
                  <WarnIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Fix {syntaxErrors.length} syntax error{syntaxErrors.length > 1 ? 's' : ''} before submitting</span>
                </div>
              )}
              {isProcessing && message && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2.5 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  {message}
                </div>
              )}
            </div>

            {/* Right: line count + submit button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] text-[#858585] font-mono hidden sm:block">
                Ln {lineCount} · {selectedLanguage}
              </span>

              <button
                onClick={validateAndSubmit}
                disabled={isQuestionLocked}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  hasErrors && !isQuestionLocked
                    ? 'bg-rose-700/80 hover:bg-rose-700 text-white cursor-not-allowed'
                    : isProcessing
                    ? 'bg-amber-500/80 text-white cursor-wait'
                    : currentQuestion?.isEvaluated
                    ? 'bg-emerald-600/80 text-white cursor-default'
                    : isQuestionLocked
                    ? 'bg-[#3e3e42] text-[#858585] cursor-default'
                    : 'bg-[#1B6C42] hover:bg-[#22874f] text-white hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-[#1B6C42]/30'
                }`}
              >
                {hasErrors && !isQuestionLocked ? (
                  <>
                    <WarnIcon className="w-4 h-4" />
                    Fix Errors
                  </>
                ) : isProcessing ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white/50 border-t-white rounded-full" />
                    Analyzing...
                  </>
                ) : currentQuestion?.isEvaluated ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Evaluated
                  </>
                ) : isQuestionLocked ? (
                  'Submitted'
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Answer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ FINISH CONFIRM MODAL ══════════ */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-14 h-14 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <WarnIcon className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="font-playfair text-xl font-bold text-gray-900 text-center mb-2">Finish Interview?</h3>
            <p className="text-sm text-gray-500 text-center mb-8 font-light leading-relaxed">
              This will end your session and generate your full AI performance report.
              Unanswered questions will be marked as incomplete.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={handleFinishInterview}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Yes, Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ INTERVBOT ASSISTANT ══════════ */}
      <IntervBot questionContext={currentQuestion?.questionText || ''} />

    </div>
  );
}

export default InterviewRunner;