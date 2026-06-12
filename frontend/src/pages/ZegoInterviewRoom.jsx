import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import RealHumanAvatar from '../components/RealHumanAvatar';
import { getInterviewer } from '../data/interviewerProfiles';
import { getStream, clearStream } from '../utils/streamStore';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Maximize2,
  MessageSquare, Loader2, Clock, User, Volume2,
  CheckCircle2, Circle, FileText, Sparkles, ArrowLeft,
  ChevronRight, BarChart3, Calendar, Users
} from 'lucide-react';

const STATUS = {
  IDLE: 'idle',
  AI_SPEAKING: 'ai_speaking',
  LISTENING: 'listening',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  THINKING: 'thinking'
};

export default function ZegoInterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const lobbyState = location.state;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zegoConnected, setZegoConnected] = useState(false);
  const [zegoError, setZegoError] = useState(null);

  // UI States
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState('');
  const [avatarExpression, setAvatarExpression] = useState('smiling');
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [avatarVideoSrc, setAvatarVideoSrc] = useState(null);
  const [liveNotes, setLiveNotes] = useState([]);
  const [liveSummary, setLiveSummary] = useState("Analyzing the candidate's responses...");

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState('questions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const avatarStateRef = useRef({ mouthOpen: 0, expression: 'neutral' });
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const durationTimerRef = useRef(null);
  const containerRef = useRef(null);
  const audioLevelRef = useRef(0);
  const statusRef = useRef(STATUS.IDLE);
  const isMutedRef = useRef(false);

  // ZegoCloud Refs
  const zgRef = useRef(null);
  const zgInitGuardRef = useRef(false);
  const publishStreamIdRef = useRef(`candidate_${Date.now()}`);

  const [interviewer, setInterviewer] = useState(null);

  const getStatusLabel = (s) => {
    switch (s) {
      case STATUS.AI_SPEAKING: return 'AI Interviewer is speaking...';
      case STATUS.LISTENING: return 'Listening...';
      case STATUS.RECORDING: return 'Recording...';
      case STATUS.PROCESSING: return 'Processing your response...';
      case STATUS.THINKING: return 'AI is thinking...';
      default: return '';
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('interviewer');
    if (lobbyState?.interviewer) {
      setInterviewer(lobbyState.interviewer);
      localStorage.setItem('interviewer', JSON.stringify(lobbyState.interviewer));
    } else if (stored) {
      try { setInterviewer(JSON.parse(stored)); } catch { }
    }
    fetchSession();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      destroyZegoEngine();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      localStorage.removeItem('interviewer');
      clearStream();
    };
  }, [sessionId]);

  // Sync avatar expression from status
  useEffect(() => {
    if (status === STATUS.AI_SPEAKING) {
      setAvatarExpression('speaking');
    } else if (status === STATUS.LISTENING || status === STATUS.RECORDING) {
      setAvatarExpression('listening');
    } else if (status === STATUS.THINKING || status === STATUS.PROCESSING) {
      setAvatarExpression('thinking');
    } else {
      setAvatarExpression('smiling');
    }
  }, [status]);

  // Audio level animation helper
  useEffect(() => {
    if (status !== STATUS.RECORDING && status !== STATUS.LISTENING) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(audioLevelRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  // Duration timer
  useEffect(() => {
    if (!loading && session) {
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [loading, session]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchSession = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSession(data);

      // Use lobby stream or setup webcam
      const lobbyStream = getStream();
      if (lobbyStream) {
        streamRef.current = lobbyStream;
        if (videoRef.current) {
          videoRef.current.srcObject = lobbyStream;
        }
        await initZegoCloud(user, lobbyStream);
      } else {
        await setupWebcam();
        await initZegoCloud(user);
      }

      setLoading(false);
      setupMediaRecorder();

      if (data.transcript.length === 0) {
        setTimeout(() => startInterview(), 2000);
      }
    } catch (err) {
      toast.error('Failed to join room');
      navigate('/dashboard');
    }
  };

  const refreshSession = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSession(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh session', err);
      return session;
    }
  };

  const fetchLiveNotes = async (currentSession) => {
    if (!currentSession || !currentSession.config) return;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/simulation/update-notes`,
        { config: currentSession.config, history: currentSession.transcript }
      );
      setLiveNotes(data.notes || []);
      setLiveSummary(data.summary || "Analyzing...");
    } catch (err) {
      console.error("Failed to fetch live notes", err);
    }
  };

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Webcam error:', err);
      toast.error('Could not access camera/microphone');
      return null;
    }
  };

  const destroyZegoEngine = () => {
    if (zgRef.current) {
      try { zgRef.current.logoutRoom(sessionId); } catch {}
      try { zgRef.current.destroyEngine(); } catch {}
      zgRef.current = null;
    }
    zgInitGuardRef.current = false;
  };

  const initZegoCloud = async (user, existingStream) => {
    if (zgInitGuardRef.current) return;
    zgInitGuardRef.current = true;
    if (zgRef.current) destroyZegoEngine();
    try {
      const { data: creds } = await axios.get(
        `${import.meta.env.VITE_API_URL}/simulation/zego/credentials`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const serverUrl = `wss://wsliveroom-${creds.appId}.zegocloud.com/ws`;
      const zg = new ZegoExpressEngine(creds.appId, serverUrl);
      zgRef.current = zg;

      zg.on('roomStateUpdate', (roomID, state, errorCode) => {
        console.log('Zego Room State:', state, 'errorCode:', errorCode);
        if (state === 'CONNECTED') setZegoConnected(true);
        else if (state === 'DISCONNECTED') setZegoConnected(false);
      });
      zg.on('publisherStateUpdate', ({ state, errorCode }) => {
        console.log('Zego Publisher:', state, errorCode);
      });

      await zg.loginRoom(sessionId, creds.token, {
        userID: creds.userId,
        userName: user.name || 'Candidate'
      });

      if (existingStream) {
        zg.publishStream(publishStreamIdRef.current, existingStream);
      } else {
        const localStream = await zg.createStream({
          camera: { video: true, audio: true }
        });
        streamRef.current = localStream;
        if (videoRef.current) videoRef.current.srcObject = localStream;
        zg.publishStream(publishStreamIdRef.current, localStream);
      }

      setZegoConnected(true);
    } catch (err) {
      console.error('ZegoCloud init error:', err);
      setZegoError(err.message || 'Connection failed');
      toast.error('ZegoCloud connection failed - running in local mode');
      setZegoConnected(false);
    }
  };

  const startMediaRecorder = () => {
    if (!mediaRecorderRef.current) setupMediaRecorder();
    if (!mediaRecorderRef.current) return false;
    try {
      if (mediaRecorderRef.current.state === 'recording') return true;
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      } else {
        audioChunksRef.current = [];
        mediaRecorderRef.current.start(250);
      }
      statusRef.current = STATUS.RECORDING;
      setStatus(STATUS.RECORDING);
      return true;
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      return false;
    }
  };

  const stopMediaRecorder = () => {
    if (!mediaRecorderRef.current) return;
    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.error('Failed to stop MediaRecorder:', e);
    }
  };

  // VAD
  const setupMediaRecorder = () => {
    if (!streamRef.current) return;

    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      mediaRecorderRef.current = null;
      statusRef.current = STATUS.PROCESSING;
      setStatus(STATUS.PROCESSING);
      processAudio();
    };

    mediaRecorderRef.current = mediaRecorder;
    setupVAD(streamRef.current);
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    if (audioBlob.size < 500) {
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
      setTimeout(() => startMediaRecorder(), 300);
      return;
    }

    try {
      setTranscript('Transcribing...');
      const user = JSON.parse(localStorage.getItem('user'));

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const { data: transcribeData } = await axios.post(
        `${import.meta.env.VITE_API_URL}/simulation/transcribe`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const text = transcribeData.text;
      if (text && text.trim().length > 2) {
        setTranscript(text);
        await sendChat(text);
      } else {
        statusRef.current = STATUS.LISTENING;
        setStatus(STATUS.LISTENING);
        setTimeout(() => startMediaRecorder(), 300);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscript('');
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
      setTimeout(() => startMediaRecorder(), 500);
    }
  };

  const setupVAD = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.minDecibels = -60;
      analyser.fftSize = 512;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkSilence = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          audioLevelRef.current = 0;
          requestAnimationFrame(checkSilence);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        audioLevelRef.current = Math.min(100, Math.round((average / 255) * 100));

        if (average > 10) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          isSpeakingRef.current = true;
        } else {
          if (isSpeakingRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
              isSpeakingRef.current = false;
            }, 2000);
          }
        }
        requestAnimationFrame(checkSilence);
      };
      checkSilence();
    } catch (e) {
      console.error('VAD Setup failed', e);
    }
  };

  const startInterview = async () => {
    statusRef.current = STATUS.AI_SPEAKING;
    setStatus(STATUS.AI_SPEAKING);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/simulation/${sessionId}/chat`,
        { message: 'I have joined the room. Please start the interview.' },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      playAIAudio(data.audioBase64, data.reply, data.videoBase64);
      const updatedSession = await refreshSession();
      fetchLiveNotes(updatedSession);
    } catch (err) {
      toast.error('Failed to start interview');
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
    }
  };

  const sendChat = async (text) => {
    if (!text.trim()) return;
    try {
      statusRef.current = STATUS.THINKING;
      setStatus(STATUS.THINKING);
      setTranscript('');

      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/simulation/${sessionId}/chat`,
        { message: text },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      playAIAudio(data.audioBase64, data.reply, data.videoBase64);
      const updatedSession = await refreshSession();
      fetchLiveNotes(updatedSession);
    } catch (err) {
      toast.error('Failed to get AI response');
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
    }
  };

  const speakWithBrowserTTS = (text, onDone) => {
    if (!window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    const syncLip = () => {
      if (window.speechSynthesis.speaking) {
        avatarStateRef.current.mouthOpen = 0.3 + Math.random() * 0.4;
        setTimeout(() => {
          if (window.speechSynthesis.speaking) requestAnimationFrame(syncLip);
        }, 120);
      } else {
        avatarStateRef.current.mouthOpen = 0;
      }
    };

    utterance.onstart = syncLip;
    utterance.onend = () => {
      avatarStateRef.current.mouthOpen = 0;
      if (onDone) onDone();
    };
    utterance.onerror = () => {
      avatarStateRef.current.mouthOpen = 0;
      if (onDone) onDone();
    };
    window.speechSynthesis.speak(utterance);
  };

  const playAIAudio = (base64Audio, replyText, base64Video = null) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    if (base64Video) {
      setAvatarVideoSrc(`data:video/mp4;base64,${base64Video}`);
    } else {
      setAvatarVideoSrc(null);
    }

    if (replyText) {
      setTranscript(replyText);
    }

    const onSpeakingDone = () => {
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
      setTranscript('');
      setAvatarVideoSrc(null);
      if (!isMutedRef.current) {
        setTimeout(() => startMediaRecorder(), 500);
      }
    };

    const tryPlayAudio = () => {
      if (base64Audio) {
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(audio);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(audioCtx.destination);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const syncLip = () => {
            if (audio.paused || audio.ended) {
              avatarStateRef.current.mouthOpen = 0;
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            avatarStateRef.current.mouthOpen = Math.min(1, avg / 128);
            requestAnimationFrame(syncLip);
          };
          audio.addEventListener('play', syncLip);
          audio.onended = onSpeakingDone;
        } catch (e) {
          audio.onended = onSpeakingDone;
        }

        audio.play().catch(() => {
          speakWithBrowserTTS(replyText || '', onSpeakingDone);
        });
      } else {
        speakWithBrowserTTS(replyText || '', onSpeakingDone);
      }
    };

    tryPlayAudio();
  };

  const toggleListen = () => {
    if (status === STATUS.AI_SPEAKING || status === STATUS.THINKING || status === STATUS.PROCESSING) return;
    if (status === STATUS.RECORDING || status === STATUS.LISTENING) {
      stopMediaRecorder();
    } else {
      setTranscript('Listening...');
      startMediaRecorder();
    }
  };

  const endInterview = async () => {
    const confirmed = window.confirm('Are you sure you want to end this interview?');
    if (!confirmed) return;

    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    stopMediaRecorder();
    if (zgRef.current) {
      try { zgRef.current.logoutRoom(sessionId); } catch { }
    }

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      toast.info('Analyzing interview and generating report...');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/simulation/${sessionId}/finish`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      navigate(`/simulation/result/${sessionId}`);
    } catch (err) {
      toast.error('Failed to generate report');
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !isCameraOn;
        if (zgRef.current) {
          zgRef.current.mutePublishStreamVideo(!isCameraOn, publishStreamIdRef.current);
        }
      }
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = isMuted;
        if (zgRef.current) {
          zgRef.current.mutePublishStreamAudio(isMuted, publishStreamIdRef.current);
        }
      }
      const newMuted = !isMuted;
      isMutedRef.current = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && (status === STATUS.LISTENING || status === STATUS.RECORDING)) {
        stopMediaRecorder();
      }
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const isActiveListen = status === STATUS.LISTENING || status === STATUS.RECORDING;
  const isAIBusy = status === STATUS.AI_SPEAKING || status === STATUS.THINKING || status === STATUS.PROCESSING;

  // Derive questions from session transcript (AI messages containing '?')
  const questions = useMemo(() => {
    if (!session?.transcript) return [];
    const qs = [];
    for (let i = 0; i < session.transcript.length; i++) {
      const entry = session.transcript[i];
      const entryMsg = entry.content || entry.message || '';
      if (entry.role === 'ai' && entryMsg && entryMsg.includes('?')) {
        const sentences = entryMsg.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const questionText = sentences.length > 0 ? sentences[sentences.length - 1].trim() + '?' : entryMsg.substring(0, 120);
        const hasResponse = i + 1 < session.transcript.length && session.transcript[i + 1]?.role === 'user';
        const nextMsg = session.transcript[i + 1]?.content || session.transcript[i + 1]?.message || '';
        qs.push({
          id: i,
          text: questionText.length > 120 ? questionText.substring(0, 117) + '...' : questionText,
          fullText: entryMsg,
          completed: hasResponse,
          response: hasResponse ? nextMsg : null
        });
      }
    }
    return qs;
  }, [session?.transcript]);

  // Derive timeline events
  const timeline = useMemo(() => {
    if (!session?.transcript) return [];
    const events = [{ type: 'start', label: 'Interview Started', time: 0 }];
    let questionCount = 0;
    session.transcript.forEach((entry, idx) => {
      const entryMsg = entry.content || entry.message || '';
      if (entry.role === 'ai' && entryMsg.includes('?')) {
        questionCount++;
        events.push({ type: 'question', label: `Question ${questionCount} asked`, time: idx });
      } else if (entry.role === 'user') {
        events.push({ type: 'response', label: 'Candidate responded', time: idx });
      }
    });
    return events;
  }, [session?.transcript]);

  const interviewTitle = useMemo(() => {
    const role = session?.config?.targetRole || 'Software Engineer';
    const type = session?.config?.interviewType || 'Technical';
    return `${role} — ${type} Interview`;
  }, [session]);

  const statusConfig = {
    [STATUS.IDLE]: { color: 'bg-gray-400', label: 'Ready', textColor: 'text-gray-500' },
    [STATUS.AI_SPEAKING]: { color: 'bg-blue-500', label: 'Speaking', textColor: 'text-blue-600' },
    [STATUS.LISTENING]: { color: 'bg-emerald-500', label: 'Listening', textColor: 'text-emerald-600' },
    [STATUS.RECORDING]: { color: 'bg-emerald-500', label: 'Recording', textColor: 'text-emerald-600' },
    [STATUS.PROCESSING]: { color: 'bg-amber-500', label: 'Processing', textColor: 'text-amber-600' },
    [STATUS.THINKING]: { color: 'bg-indigo-500', label: 'Thinking', textColor: 'text-indigo-600' }
  };
  const currentStatus = statusConfig[status] || statusConfig[STATUS.IDLE];

  // ---------- LOADING STATE ----------
  if (loading) {
    return (
      <div className="interview-room fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'var(--ir-bg)' }}>
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 rounded-full animate-spin" style={{ borderColor: '#EEF2FF', borderTopColor: '#4F46E5' }} />
          <div className="absolute inset-0 w-20 h-20 border-4 rounded-full animate-spin" style={{ borderColor: '#EEF2FF10', borderBottomColor: '#4F46E580', animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ir-text)' }}>Preparing Interview Room</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--ir-text-secondary)' }}>Setting up AI interviewer, audio, and video...</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ir-text-secondary)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--ir-primary)' }} />
          Initializing AI models
        </div>
      </div>
    );
  }

  // ---------- MAIN RENDER ----------
  return (
    <div ref={containerRef} className="interview-room fixed inset-0 z-50 flex flex-col font-sans" style={{ background: 'var(--ir-bg)' }}>

      {/* ========== TOP NAVIGATION BAR ========== */}
      <div className="glass-card h-14 flex items-center justify-between px-5 shrink-0 z-20" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ir-primary)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ color: 'var(--ir-text)' }}>{interviewTitle}</h1>
              <p className="text-[11px]" style={{ color: 'var(--ir-text-secondary)' }}>AI-Powered Mock Interview</p>
            </div>
          </div>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--ir-border-light)' }}>
            <span className={`ir-status-dot ${currentStatus.color}`} />
            <span className={`text-xs font-semibold ${currentStatus.textColor}`}>{currentStatus.label}</span>
          </div>
        </div>

        {/* Right: Recording + Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: 'var(--ir-border)', background: 'white' }}>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium" style={{ color: 'var(--ir-danger)' }}>Live Recording</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--ir-border-light)' }}>
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--ir-text-secondary)' }} />
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--ir-text)' }}>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* ---- LEFT COLUMN: Video + Meeting Notes (70%) ---- */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Video Container */}
          <div className="ir-video-container flex-1 relative">
            {/* AI Interviewer */}
            {interviewer ? (
              <div className="w-full h-full">
                <RealHumanAvatar
                  profile={interviewer}
                  isSpeaking={status === STATUS.AI_SPEAKING}
                  expression={avatarExpression}
                  stateRef={avatarStateRef}
                  width={960}
                  height={640}
                  videoSrc={avatarVideoSrc}
                />
                <div className="ir-avatar-vignette" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center">
                  <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${status === STATUS.AI_SPEAKING ? 'border-indigo-400 bg-indigo-900/40' : 'border-gray-700 bg-gray-800'}`}>
                    <User className="w-14 h-14 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium">{getStatusLabel(status) || 'Waiting...'}</p>
                </div>
              </div>
            )}

            {/* Interviewer Name Badge (bottom-left overlay) */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
              <div className="glass-card-dark px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2.5">
                  {interviewer?.photoUrl && (
                    <img src={interviewer.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/20" />
                  )}
                  <div>
                    <p className="text-sm text-white font-semibold leading-tight">{interviewer?.fullName || 'AI Interviewer'}</p>
                    <p className="text-[11px] text-white/60">{interviewer?.title || ''}</p>
                  </div>
                </div>
              </div>
              {/* Speaking wave indicator */}
              {status === STATUS.AI_SPEAKING && (
                <div className="glass-card-dark px-2.5 py-2 rounded-xl flex items-center gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="ir-wave-bar bg-blue-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>

            {/* User PIP (top-right overlay) */}
            <div className="absolute top-4 right-4 w-48 aspect-video ir-pip z-10">
              {isCameraOn && streamRef.current ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                <span className="text-[11px] text-white bg-black/50 px-2 py-0.5 rounded font-medium">
                  You
                </span>
                {status === STATUS.RECORDING && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                {isMuted && (
                  <span className="bg-red-500/80 p-0.5 rounded">
                    <MicOff className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>
            </div>

            {/* Transcript overlay (center-bottom) */}
            {transcript && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none z-10">
                <div className="ir-transcript-overlay px-5 py-3">
                  <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--ir-text)' }}>
                    {transcript}
                  </p>
                </div>
              </div>
            )}

            {/* Bottom video controls (overlaid on video) */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="flex items-center justify-center gap-2 py-3 px-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                <button
                  onClick={toggleMute}
                  className={`ir-control-btn ${isMuted ? 'active' : ''}`}
                  style={!isMuted ? { background: 'rgba(255,255,255,0.15)', color: 'white' } : {}}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`ir-control-btn ${!isCameraOn ? 'active' : ''}`}
                  style={isCameraOn ? { background: 'rgba(255,255,255,0.15)', color: 'white' } : {}}
                  aria-label={!isCameraOn ? 'Turn on camera' : 'Turn off camera'}
                >
                  {!isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleListen}
                  disabled={isAIBusy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all"
                  style={{
                    background: isActiveListen ? '#22C55E' : 'rgba(255,255,255,0.15)',
                    color: 'white',
                    opacity: isAIBusy ? 0.5 : 1,
                    cursor: isAIBusy ? 'not-allowed' : 'pointer',
                    boxShadow: isActiveListen ? '0 0 20px rgba(34,197,94,0.3)' : 'none'
                  }}
                  aria-label={isActiveListen ? 'Stop listening' : 'Start listening'}
                >
                  {status === STATUS.RECORDING ? (
                    <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Recording</>
                  ) : isActiveListen ? (
                    <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Listening</>
                  ) : status === STATUS.AI_SPEAKING ? (
                    <><Volume2 className="w-4 h-4" /> Speaking</>
                  ) : status === STATUS.THINKING ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Thinking</>
                  ) : status === STATUS.PROCESSING ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
                  ) : (
                    <><Mic className="w-4 h-4" /> Tap to Speak</>
                  )}
                </button>

                <button
                  className="ir-control-btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <div className="w-px h-8 bg-white/20 mx-1" />

                <button
                  onClick={endInterview}
                  className="ir-control-btn active"
                  aria-label="End Interview"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Meeting Notes Section (below video) */}
          <div className="ir-notes-section p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--ir-text)' }}>Key Meeting Notes — {interviewTitle}</h3>
              <button className="p-1 rounded hover:bg-gray-100 transition-colors" aria-label="More options">
                <Settings className="w-4 h-4" style={{ color: 'var(--ir-text-secondary)' }} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ir-text-secondary)' }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--ir-primary-light)', color: 'var(--ir-primary)' }}>
                <BarChart3 className="w-3 h-3" />
                <span className="font-medium">{session?.config?.interviewType || 'Technical'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ir-text-secondary)' }}>
                <Users className="w-3.5 h-3.5" />
                <span>{interviewer?.fullName || 'AI'}, Candidate</span>
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--ir-primary-light)' }}>
              <div className="ir-ai-badge mb-2">
                <Sparkles className="w-3 h-3" />
                AI Summary of Meeting
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ir-text-secondary)' }}>
                {liveSummary}
              </p>
            </div>
          </div>
        </div>

        {/* ---- RIGHT SIDEBAR (30%) ---- */}
        {!sidebarCollapsed && (
          <div className="w-[340px] shrink-0 flex flex-col gap-4">

            {/* Sidebar Tabs Card */}
            <div className="bg-white rounded-2xl border flex flex-col flex-1 overflow-hidden" style={{ borderColor: 'var(--ir-border)', boxShadow: 'var(--ir-shadow-sm)' }}>
              {/* Tab Header */}
              <div className="flex items-center border-b px-1" style={{ borderColor: 'var(--ir-border)' }}>
                <button className={`ir-tab ${sidebarTab === 'questions' ? 'active' : ''}`} onClick={() => setSidebarTab('questions')}>Questions</button>
                <button className={`ir-tab ${sidebarTab === 'timeline' ? 'active' : ''}`} onClick={() => setSidebarTab('timeline')}>Timeline</button>
                <button className={`ir-tab ${sidebarTab === 'notes' ? 'active' : ''}`} onClick={() => setSidebarTab('notes')}>Notes</button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto ir-sidebar p-3">

                {/* QUESTIONS TAB */}
                {sidebarTab === 'questions' && (
                  <div className="flex flex-col gap-2.5">
                    {questions.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ir-border)' }} />
                        <p className="text-xs" style={{ color: 'var(--ir-text-secondary)' }}>Questions will appear here as the interview progresses</p>
                      </div>
                    ) : (
                      questions.map((q, idx) => {
                        const isActive = idx === questions.length - 1 && !q.completed;
                        return (
                          <div key={q.id} className={`ir-question-card ${isActive ? 'active' : ''} ${q.completed ? 'completed' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 mt-0.5">
                                {q.completed ? (
                                  <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ir-success)' }} />
                                ) : isActive ? (
                                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: 'var(--ir-primary)', background: 'var(--ir-primary-light)' }}>
                                    <span className="text-[9px] font-bold" style={{ color: 'var(--ir-primary)' }}>{String(idx + 1).padStart(2, '0')}</span>
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: 'var(--ir-border)' }}>
                                    <span className="text-[9px] font-bold" style={{ color: 'var(--ir-text-secondary)' }}>{String(idx + 1).padStart(2, '0')}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--ir-text)' }}>{q.text}</p>
                                {q.response && (
                                  <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--ir-text-secondary)' }}>
                                    {q.response.substring(0, 100)}{q.response.length > 100 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TIMELINE TAB */}
                {sidebarTab === 'timeline' && (
                  <div className="flex flex-col gap-0">
                    {timeline.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ir-border)' }} />
                        <p className="text-xs" style={{ color: 'var(--ir-text-secondary)' }}>Timeline events will appear here</p>
                      </div>
                    ) : (
                      timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-2">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              event.type === 'start' ? 'bg-indigo-500' :
                              event.type === 'question' ? 'bg-blue-500' :
                              'bg-emerald-500'
                            }`} />
                            {idx < timeline.length - 1 && <div className="w-px flex-1 min-h-[16px] bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-2">
                            <p className="text-[12px] font-medium" style={{ color: 'var(--ir-text)' }}>{event.label}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* NOTES TAB */}
                {sidebarTab === 'notes' && (
                  <div className="flex flex-col gap-2.5">
                    {liveNotes.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ir-border)' }} />
                        <p className="text-xs" style={{ color: 'var(--ir-text-secondary)' }}>AI-generated notes will appear here in real-time</p>
                      </div>
                    ) : (
                      liveNotes.map((note, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg" style={{ background: 'var(--ir-border-light)' }}>
                          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ir-text)' }}>{note}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Interviewer Profile Card */}
            <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'var(--ir-border)', boxShadow: 'var(--ir-shadow-sm)' }}>
              <div className="flex items-center gap-3">
                {interviewer?.photoUrl ? (
                  <img src={interviewer.photoUrl} alt={interviewer.fullName} className="w-12 h-12 rounded-xl object-cover" style={{ border: `2px solid ${interviewer.color || 'var(--ir-primary)'}` }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--ir-primary-light)' }}>
                    <User className="w-6 h-6" style={{ color: 'var(--ir-primary)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--ir-text)' }}>{interviewer?.fullName || 'AI Interviewer'}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--ir-text-secondary)' }}>{interviewer?.title || 'Senior Engineer'}</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ir-border)' }} />
              </div>
              {interviewer && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--ir-primary-light)', color: 'var(--ir-primary)' }}>{interviewer.exCompany}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--ir-border-light)', color: 'var(--ir-text-secondary)' }}>{interviewer.experience}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
