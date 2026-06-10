import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import AiInterviewerAvatar from '../components/AiInterviewerAvatar';
import { getInterviewer } from '../data/interviewerProfiles';
import { getStream, clearStream } from '../utils/streamStore';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Maximize2,
  Monitor, ChevronUp, Loader2, Wifi, WifiOff, Clock, User, Volume2, Circle
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
      if (zgRef.current) {
        try { zgRef.current.logoutRoom(sessionId); } catch { }
        try { zgRef.current.destroyEngine(); } catch { }
      }
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

  const initZegoCloud = async (user, existingStream) => {
    try {
      const { data: creds } = await axios.get(
        `${import.meta.env.VITE_API_URL}/simulation/zego/credentials`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const zg = new ZegoExpressEngine(creds.appId, 1);
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

      playAIAudio(data.audioBase64, data.reply);
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

      playAIAudio(data.audioBase64, data.reply);
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

  const playAIAudio = (base64Audio, replyText) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    if (replyText) {
      setTranscript(replyText);
    }

    const onSpeakingDone = () => {
      statusRef.current = STATUS.LISTENING;
      setStatus(STATUS.LISTENING);
      setTranscript('');
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
      if ((status === STATUS.LISTENING || status === STATUS.RECORDING) && !isMuted) {
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-500/10 border-b-indigo-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Preparing Interview Room</h2>
        <p className="text-zinc-400 text-sm mb-6">Setting up AI interviewer, audio, and video...</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          Initializing AI Interviewer
        </div>
        {zegoError && (
          <div className="mt-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
            ZegoCloud: {zegoError} (running in local mode)
          </div>
        )}
      </div>
    );
  }

  const connectionStatus = () => {
    if (session?.config?.interviewType === 'Technical') return 'Technical Interview';
    if (session?.config?.interviewType === 'HR') return 'HR Interview';
    if (session?.config?.interviewType === 'System Design') return 'System Design Interview';
    return `${session?.config?.targetRole || 'Interview'} Session`;
  };

  const statusColors = {
    [STATUS.IDLE]: 'bg-zinc-500',
    [STATUS.AI_SPEAKING]: 'bg-blue-500',
    [STATUS.LISTENING]: 'bg-green-500',
    [STATUS.RECORDING]: 'bg-green-500',
    [STATUS.PROCESSING]: 'bg-yellow-500',
    [STATUS.THINKING]: 'bg-indigo-500'
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
      {/* Top Bar - Zoom Style */}
      <div className="h-12 bg-zinc-900 flex items-center justify-between px-4 shrink-0 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">
            {connectionStatus()}
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded text-xs">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-medium">REC</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio Level Meter */}
          {(status === STATUS.RECORDING || status === STATUS.LISTENING) && audioLevel > 0 && (
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-green-400" />
              <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, audioLevel * 2)}%` }}
                />
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {zegoConnected ? (
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
            )}
            <span className={`text-xs ${zegoConnected ? 'text-green-400' : 'text-yellow-400'}`}>
              {zegoConnected ? 'Connected' : 'Local Mode'}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* Top Status Bar */}
      <div className="h-8 bg-zinc-900/80 flex items-center justify-center gap-2 border-b border-zinc-800/30">
        <span className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-zinc-500'} ${status === STATUS.AI_SPEAKING || status === STATUS.RECORDING || status === STATUS.PROCESSING || status === STATUS.THINKING ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-zinc-300 font-medium">
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main - AI Interviewer (left/large) */}
        <div className="flex-1 relative bg-zinc-900">
          {interviewer ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950">
              <AiInterviewerAvatar
                profile={interviewer}
                isSpeaking={status === STATUS.AI_SPEAKING}
                expression={avatarExpression}
                stateRef={avatarStateRef}
                width={640}
                height={480}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${status === STATUS.AI_SPEAKING ? 'border-indigo-400 bg-indigo-900/40' : 'border-zinc-700 bg-zinc-800'}`}>
                  <User className="w-16 h-16 text-zinc-500" />
                </div>
                <p className="text-zinc-400 text-lg font-medium">
                  {getStatusLabel(status) || 'Waiting...'}
                </p>
              </div>
            </div>
          )}

          {/* Interviewer name badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/10">
              <p className="text-sm text-white font-medium">
                {interviewer?.fullName || 'AI Interviewer'}
              </p>
              <p className="text-xs text-zinc-400">{interviewer?.title || ''}</p>
            </div>

            {/* Audio level indicator when recording */}
            {(status === STATUS.RECORDING) && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="w-0.5 bg-green-400 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(4, (audioLevel / 20) * (i / 5) * 16)}px`,
                        opacity: audioLevel > i * 15 ? 1 : 0.3
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-green-400 font-medium">REC</span>
              </div>
            )}
          </div>
        </div>

        {/* PIP - Candidate (right/small) */}
        <div className="absolute bottom-4 right-4 w-64 aspect-video bg-zinc-800 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl">
          {isCameraOn && streamRef.current ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-zinc-500" />
              </div>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2">
            <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded font-medium">
              You {(status === STATUS.RECORDING) && <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block ml-1 animate-pulse" />}
            </span>
          </div>
        </div>

        {/* Transcript overlay */}
        {transcript && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 shadow-2xl">
              <p className="text-white text-center text-base leading-relaxed">
                {transcript}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - Zoom Style */}
      <div className="h-20 bg-zinc-900 flex items-center justify-center gap-3 px-4 shrink-0 border-t border-zinc-800/50">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!isCameraOn ? 'bg-red-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          title={isCameraOn ? 'Stop Video' : 'Start Video'}
          aria-label={!isCameraOn ? 'Turn on camera' : 'Turn off camera'}
        >
          {!isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <div className="w-px h-8 bg-zinc-800" />

        <button
          onClick={toggleListen}
          disabled={isAIBusy}
          className={`px-8 h-12 rounded-full flex items-center justify-center gap-2 font-semibold transition-all ${isActiveListen ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'} ${isAIBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isActiveListen ? 'Stop listening' : 'Tap to Speak'}
          aria-label={isActiveListen ? 'Stop listening' : 'Start listening'}
        >
          {status === STATUS.RECORDING ? (
            <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Recording</>
          ) : isActiveListen ? (
            <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Listening</>
          ) : status === STATUS.AI_SPEAKING ? (
            <><span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /> AI Speaking</>
          ) : status === STATUS.THINKING ? (
            <><span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" /> Thinking</>
          ) : status === STATUS.PROCESSING ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
          ) : (
            <><Mic className="w-4 h-4" /> Tap to Speak</>
          )}
        </button>

        <div className="w-px h-8 bg-zinc-800" />

        <button
          onClick={toggleFullScreen}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-800 text-white hover:bg-zinc-700 transition-all"
          title="Full Screen"
          aria-label={isFullScreen ? "Exit Full Screen" : "Full Screen"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={endInterview}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white transition-all"
          title="End Interview"
          aria-label="End Interview"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
