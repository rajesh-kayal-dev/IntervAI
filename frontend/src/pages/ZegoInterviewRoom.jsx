import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Settings, Loader2, User, Bot } from 'lucide-react';
import { toast } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';

export default function ZegoInterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    fetchSession();
    setupWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSession(data);
      setLoading(false);
      
      // Kickoff interview if transcript is empty
      if (data.transcript.length === 0) {
        handleSendChat("I have joined the room. Please start the interview.");
      }
    } catch (err) {
      toast.error('Failed to join room');
      navigate('/dashboard');
    }
  };

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Webcam error:", err);
      toast.error("Could not access camera/microphone");
    }
  };

  const setupMediaRecorder = () => {
    if (!streamRef.current) return;
    
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];
      setIsListening(false);
      
      // Step 1: Transcribe
      try {
        setTranscript("Transcribing...");
        const user = JSON.parse(localStorage.getItem('user'));
        
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        
        const { data: transcribeData } = await axios.post(`${import.meta.env.VITE_API_URL}/simulation/transcribe`, formData, {
          headers: { 
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        const text = transcribeData.text;
        setTranscript(text);
        
        if (text) {
          handleSendChat(text);
        } else {
          setTranscript("Could not hear you properly. Try again.");
          setTimeout(() => setTranscript(""), 2000);
        }
      } catch (err) {
        console.error("Transcription error:", err);
        setTranscript("Transcription failed.");
        setTimeout(() => setTranscript(""), 2000);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
  };

  const toggleListen = () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
    } else {
      if (!mediaRecorderRef.current) setupMediaRecorder();
      setTranscript("Listening...");
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendChat = async (text) => {
    if (!text.trim()) return;
    
    try {
      setIsAISpeaking(true); 
      setTranscript("AI is thinking...");
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}/chat`, 
        { message: text },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      setTranscript("");
      playAIAudio(data.audioBase64);
    } catch (err) {
      toast.error("Failed to get AI response");
      setIsAISpeaking(false);
      setTranscript("");
    }
  };

  const playAIAudio = (base64Audio) => {
    if (!base64Audio) {
      setIsAISpeaking(false);
      return;
    }
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    
    audio.onended = () => {
      setIsAISpeaking(false);
    };
    
    audio.play().catch(e => {
      console.error("Audio play failed:", e);
      setIsAISpeaking(false);
    });
  };

  const endInterview = async () => {
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    if (mediaRecorderRef.current && isListening) mediaRecorderRef.current.stop();
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      toast.info("Analyzing interview and generating report...");
      await axios.post(`${import.meta.env.VITE_API_URL}/simulation/${sessionId}/finish`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      navigate(`/simulation/result/${sessionId}`);
    } catch (err) {
      toast.error("Failed to generate report");
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks()[0].enabled = !isCameraOn;
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
      if (isListening && !isMuted) mediaRecorderRef.current?.stop();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <h2 className="text-xl font-semibold">Preparing ZegoCloud Room...</h2>
        <p className="text-zinc-400">Loading AI Interviewer Models</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col font-sans">
      
      {/* Top Bar */}
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-zinc-200 font-medium">Live Interview Recording</span>
        </div>
        <div className="text-zinc-300 font-semibold">{session?.config?.targetRole} Interview</div>
        <div className="px-3 py-1 rounded bg-zinc-800 text-xs text-green-400 font-mono border border-zinc-700">
          Connected (WebRTC)
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: AI Avatar (Placeholder until LivePortrait/MuseTalk) */}
        <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center">
          
          {/* Simulated Avatar Visuals */}
          <div className="relative w-64 h-64 mb-8">
            <div className={`absolute inset-0 bg-blue-500/20 rounded-full blur-3xl transition-all duration-300 ${isAISpeaking ? 'scale-150 opacity-100' : 'scale-100 opacity-30'}`}></div>
            <div className={`w-full h-full rounded-full border-4 flex items-center justify-center transition-colors duration-300 ${isAISpeaking ? 'border-blue-400 bg-blue-900/40' : 'border-zinc-700 bg-zinc-800'}`}>
               <Bot className="w-24 h-24 text-blue-400" />
            </div>
            
            {/* Lip Sync Indicator Rings */}
            {isAISpeaking && (
              <>
                <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping"></div>
                <div className="absolute -inset-4 border border-blue-400/50 rounded-full animate-ping delay-150"></div>
              </>
            )}
          </div>
          
          <div className="text-center z-10">
            <h3 className="text-2xl text-white font-medium">{session?.config?.personality}</h3>
            <p className="text-zinc-400">{isAISpeaking ? "Speaking..." : "Listening..."}</p>
          </div>
          
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-sm rounded-lg font-medium">
            AI Interviewer
          </div>
        </div>

        {/* Right: Candidate Webcam */}
        <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
          {isCameraOn ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <User className="w-16 h-16 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">Camera is off</p>
            </div>
          )}
          
          {/* Subtitles/Transcript */}
          <div className="absolute bottom-16 left-0 right-0 px-8 pointer-events-none">
            <AnimatePresence>
              {transcript && (
                <div className="bg-black/70 backdrop-blur p-4 rounded-xl text-center text-white text-lg font-medium shadow-lg max-w-xl mx-auto border border-white/10">
                  {transcript}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-sm rounded-lg font-medium flex items-center gap-2">
            You {isListening && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-4 sm:gap-6 px-6 z-10">
        
        {/* Push to talk / Toggle Mic */}
        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button 
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${!isCameraOn ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
        >
          {!isCameraOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button 
          onClick={toggleListen}
          className={`px-6 h-14 rounded-full flex items-center justify-center gap-2 font-bold transition-all ${isListening ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
        >
          {isListening ? (
            <><span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span> Listening</>
          ) : (
            <><Mic className="w-5 h-5" /> Push to Speak</>
          )}
        </button>

        <button className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">
          <Settings className="w-6 h-6" />
        </button>

        <div className="w-px h-10 bg-zinc-800 mx-2"></div>

        <button 
          onClick={endInterview}
          className="px-6 h-14 rounded-full flex items-center justify-center gap-2 font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/20"
        >
          <PhoneOff className="w-5 h-5" />
          End Interview
        </button>

      </div>
    </div>
  );
}
