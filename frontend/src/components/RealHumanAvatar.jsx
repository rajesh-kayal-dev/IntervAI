import React, { useRef, useEffect, useState, useCallback } from 'react';
import AiInterviewerAvatar from './AiInterviewerAvatar';

const PHOTO_URLS = {
  sarah: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&h=480&fit=crop&crop=face&q=80',
  neha: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=640&h=480&fit=crop&crop=face&q=80',
  priya: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=640&h=480&fit=crop&crop=face&q=80',
  david: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=480&fit=crop&crop=face&q=80',
  rahul: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=640&h=480&fit=crop&crop=face&q=80',
  alex: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=640&h=480&fit=crop&crop=face&q=80'
};

const LIP_COLORS = {
  sarah: 'rgba(201, 112, 112, 0.65)',
  neha: 'rgba(180, 90, 100, 0.65)',
  priya: 'rgba(200, 100, 120, 0.65)',
  david: 'rgba(190, 130, 120, 0.55)',
  rahul: 'rgba(160, 90, 90, 0.55)',
  alex: 'rgba(180, 120, 110, 0.55)'
};

export default function RealHumanAvatar({ profile, isSpeaking, expression = 'neutral', stateRef, width = 640, height = 480, videoSrc = null }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastFrameRef = useRef(0);

  // Sync isSpeaking with parent's stateRef for fallback canvas logic
  useEffect(() => {
    if (stateRef) {
      stateRef.current.isSpeaking = isSpeaking && !videoSrc;
    }
  }, [isSpeaking, stateRef, videoSrc]);

  const s = useRef({
    mouthOpen: 0,
    targetMouthOpen: 0,
    blinkProgress: 0,
    isBlinking: false,
    lastBlink: 0,
    nextBlink: 2000 + Math.random() * 4000,
    audioAmplitude: 0
  });

  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const state = s.current;
    const dt = Math.min((timestamp - lastFrameRef.current) / 16.667, 4);
    lastFrameRef.current = timestamp;

    if (!state.isBlinking && timestamp - state.lastBlink > state.nextBlink) {
      state.isBlinking = true;
      state.blinkProgress = 0;
    }
    if (state.isBlinking) {
      state.blinkProgress += dt * 0.04;
      if (state.blinkProgress >= 1) {
        state.isBlinking = false;
        state.blinkProgress = 0;
        state.lastBlink = timestamp;
        state.nextBlink = 3000 + Math.random() * 5000;
      }
    }

    if (stateRef?.current) {
      state.targetMouthOpen = stateRef.current.mouthOpen;
    } else {
      state.targetMouthOpen = isSpeaking ? 0.3 + state.audioAmplitude * 0.7 : 0;
    }
    state.mouthOpen += (state.targetMouthOpen - state.mouthOpen) * 0.1 * dt;
    state.audioAmplitude *= 0.95;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const ms = Math.min(canvas.width, canvas.height) / 640;
    const mouthY = canvas.height * 0.60;
    const lipColor = LIP_COLORS[profile?.id] || 'rgba(201, 112, 112, 0.65)';
    const mouthW = 18 * ms;

    if (state.mouthOpen > 0.1) {
      const mouthH = 2 + state.mouthOpen * 14 * ms;
      ctx.fillStyle = 'rgba(40, 10, 10, 0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, mouthW * 0.8, mouthH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lipColor;
      ctx.beginPath();
      ctx.ellipse(cx, mouthY - mouthH * 0.05, mouthW, 3 * ms + mouthH * 0.12, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = lipColor;
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + mouthH * 0.35, mouthW * 0.85, 3 * ms + mouthH * 0.12, 0, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.fillStyle = lipColor;
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, mouthW, 3 * ms, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.blinkProgress > 0.35 && state.blinkProgress < 0.65) {
      const eyeY = canvas.height * 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(canvas.width * 0.40, eyeY - 1.5, canvas.width * 0.055, 3);
      ctx.fillRect(canvas.width * 0.545, eyeY - 1.5, canvas.width * 0.055, 3);
    }

    animRef.current = requestAnimationFrame(animate);
  }, [isSpeaking, stateRef, profile?.id]);

  useEffect(() => {
    lastFrameRef.current = performance.now();
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animate]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setAudioAmplitude = (amp) => {
        s.current.audioAmplitude = Math.min(1, Math.max(0, amp));
      };
    }
  }, []);

  if (imgError) {
    return (
      <AiInterviewerAvatar
        profile={profile}
        isSpeaking={isSpeaking}
        expression={expression}
        stateRef={stateRef}
        width={width}
        height={height}
      />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="absolute inset-0 transition-transform duration-[2000ms] ease-in-out"
        style={{ transform: isSpeaking ? 'scale(1.008)' : 'scale(1)' }}
      >
        <img
          src={PHOTO_URLS[profile?.id]}
          alt={profile?.fullName || 'Interviewer'}
          className={'w-full h-full object-cover transition-all duration-700 ' + (imgLoaded ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={{
            objectPosition: 'center',
            filter: isSpeaking ? 'brightness(1.08) contrast(1.03) saturate(1.05)' : 'brightness(1) contrast(1) saturate(1)',
            transition: 'filter 0.4s ease, opacity 0.7s ease',
          }}
        />
        
        {/* Play video if available */}
        {videoSrc && (
          <video
            src={videoSrc}
            autoPlay
            playsInline
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover z-10"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Premium vignette overlay */}
        <div className="absolute inset-0 pointer-events-none z-20" style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(0,0,0,0.25) 100%)'
        }} />

        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          style={{ mixBlendMode: 'normal' }}
        />
      </div>

      {!videoSrc && isSpeaking && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 60%)',
            animation: 'speaking-glow 1.5s ease-in-out infinite',
          }}
        />
      )}

      {expression === 'thinking' && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.06) 0%, transparent 60%)',
          }}
        />
      )}

      {expression === 'listening' && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(34,197,94,0.05) 0%, transparent 60%)',
          }}
        />
      )}

      <style>{'@keyframes speaking-glow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }'}</style>
    </div>
  );
}
