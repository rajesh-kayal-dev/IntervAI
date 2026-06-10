import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getInterviewer } from '../data/interviewerProfiles';
import AiInterviewerAvatar from '../components/AiInterviewerAvatar';
import { setStream as storeSetStream } from '../utils/streamStore';
import { toast } from 'react-toastify';
import {
  Mic, MicOff, Video, VideoOff, MonitorSpeaker, Wifi,
  ShieldCheck, XCircle, Loader2, ArrowRight, User, Settings,
  ChevronDown, Clock, Briefcase
} from 'lucide-react';

export default function InterviewLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const setupData = location.state;

  const [interviewer, setInterviewer] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [devices, setDevices] = useState({
    camera: null,
    microphone: null,
    speaker: null,
    internet: null
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  useEffect(() => {
    if (setupData) {
      const profile = getInterviewer(setupData.interviewerGender || 'Female', setupData.interviewerId || 'sarah');
      setInterviewer(profile);
      setSessionId(setupData.sessionId);
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const runDeviceCheck = useCallback(async () => {
    setIsChecking(true);

    try {
      const netRes = await fetch('https://www.google.com', { mode: 'no-cors' });
      setDevices(prev => ({ ...prev, internet: true }));
    } catch {
      setDevices(prev => ({ ...prev, internet: false }));
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setStream(mediaStream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      setDevices(prev => ({
        ...prev,
        camera: videoInputs.length > 0,
        microphone: audioInputs.length > 0,
        speaker: true
      }));

      setIsChecking(false);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Please allow camera and microphone access');
        setDevices(prev => ({ ...prev, camera: false, microphone: false }));
      } else {
        setDevices(prev => ({ ...prev, camera: false, microphone: false }));
      }
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    runDeviceCheck();
  }, [runDeviceCheck]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const joinInterview = () => {
    if (sessionId && stream) {
      setStream(stream);
      navigate(`/simulation/room/${sessionId}`, {
        state: { interviewer, setupData }
      });
    }
  };

  const allDevicesOk = devices.camera && devices.microphone && devices.internet;

  if (!setupData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl text-white font-bold mb-2">No Setup Data</h2>
          <p className="text-zinc-400 mb-6">Please configure your interview first.</p>
          <button onClick={() => navigate('/simulation/setup')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500">
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      {/* Top bar */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="text-zinc-300 font-medium text-sm">IntervAI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
            Interview Lobby
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Your Interview is Ready
            </h1>
            <p className="text-zinc-400">Check your devices and join when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Camera preview */}
            <div className="lg:col-span-2 space-y-4">
              {/* Camera Preview */}
              <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 aspect-video relative">
                {stream && isCameraOn ? (
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-cover transform scale-x-[-1]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <User className="w-20 h-20 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500 font-medium">Camera is off</p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur flex items-center gap-1.5 ${isMicOn ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    {isMicOn ? 'Mic On' : 'Mic Off'}
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur flex items-center gap-1.5 ${isCameraOn ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    {isCameraOn ? 'Camera On' : 'Camera Off'}
                  </div>
                </div>
              </div>

              {/* Interview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Briefcase, label: 'Role', value: setupData.targetRole },
                  { icon: Clock, label: 'Duration', value: `${setupData.durationMinutes} min` },
                  { label: 'Type', value: setupData.interviewType },
                  { label: 'Difficulty', value: setupData.difficulty }
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3">
                    <span className="text-xs text-zinc-500 block mb-1">{label}</span>
                    <span className="text-sm text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Device Check Status */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Camera', key: 'camera', icon: Video },
                  { label: 'Microphone', key: 'microphone', icon: Mic },
                  { label: 'Speaker', key: 'speaker', icon: MonitorSpeaker },
                  { label: 'Internet', key: 'internet', icon: Wifi }
                ].map(({ label, key, icon: Icon }) => (
                  <div key={key} className={`bg-zinc-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${devices[key] === true ? 'border-green-500/30' : devices[key] === false ? 'border-red-500/30' : 'border-zinc-800'}`}>
                    {isChecking ? (
                      <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                    ) : devices[key] === true ? (
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs text-zinc-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Interviewer Panel */}
            <div className="space-y-4">
              {interviewer && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="h-48 bg-zinc-800 relative overflow-hidden">
                    <AiInterviewerAvatar
                      profile={interviewer}
                      isSpeaking={false}
                      expression="smiling"
                      width={400}
                      height={300}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white">{interviewer.fullName}</h3>
                    <p className="text-indigo-400 text-sm font-medium">{interviewer.title}</p>
                    <div className="flex items-center gap-2 mt-1 mb-3">
                      <span className="text-xs text-zinc-500">{interviewer.experience}</span>
                      <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                      <span className="text-xs text-zinc-500">{interviewer.exCompany}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{interviewer.personality}</p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h4 className="text-sm font-semibold text-white mb-4">Device Settings</h4>
                <div className="space-y-3">
                  <button onClick={toggleMic}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${isMicOn ? 'bg-zinc-800 text-white' : 'bg-red-500/10 text-red-400'}`}>
                    <span className="flex items-center gap-2">
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      Microphone
                    </span>
                    <span className={`text-xs ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>
                      {isMicOn ? 'On' : 'Off'}
                    </span>
                  </button>
                  <button onClick={toggleCamera}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${isCameraOn ? 'bg-zinc-800 text-white' : 'bg-red-500/10 text-red-400'}`}>
                    <span className="flex items-center gap-2">
                      {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      Camera
                    </span>
                    <span className={`text-xs ${isCameraOn ? 'text-green-400' : 'text-red-400'}`}>
                      {isCameraOn ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={joinInterview}
                disabled={!allDevicesOk || !sessionId}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${allDevicesOk && sessionId
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
              >
                {!sessionId ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Preparing Room...</>
                ) : !allDevicesOk ? (
                  <><XCircle className="w-5 h-5" /> Fix Device Issues</>
                ) : (
                  <><Video className="w-5 h-5" /> Join Interview</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
