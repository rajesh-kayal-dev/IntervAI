import React, { useRef, useEffect, useCallback, useState } from 'react';

const SKIN_TONES = {
  sarah: { base: '#F5D0B8', shadow: '#E8BFA0', blush: '#E8A0A0' },
  neha: { base: '#E8C5A0', shadow: '#D4B08A', blush: '#D4A0A0' },
  priya: { base: '#F0C8A0', shadow: '#DCB08A', blush: '#DCA0A0' },
  david: { base: '#F0D0B8', shadow: '#DCBFA0', blush: '#DCA0A0' },
  rahul: { base: '#D4A574', shadow: '#C4956A', blush: '#C49090' },
  alex: { base: '#F0D0B8', shadow: '#DCBFA0', blush: '#DCA0A0' }
};

const EYE_COLORS = {
  sarah: '#4A3728', neha: '#2D1810', priya: '#2D1810',
  david: '#4A7A9E', rahul: '#2D1810', alex: '#5B7A4A'
};

const HAIR_COLORS = {
  sarah: '#1A1A2E', neha: '#2D1810', priya: '#1A1A2E',
  david: '#4A3728', rahul: '#1A1A2E', alex: '#6B4226'
};

const LIP_COLORS = ['#C97070', '#D48080', '#C06060'];

function drawFace(ctx, width, height, profile, state) {
  const skin = SKIN_TONES[profile.id] || SKIN_TONES.sarah;
  const eyeColor = EYE_COLORS[profile.id] || '#2D1810';
  const hairColor = HAIR_COLORS[profile.id] || '#1A1A2E';
  const isFemale = ['sarah', 'neha', 'priya'].includes(profile.id);

  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 280;

  ctx.clearRect(0, 0, width, height);

  // Background - professional office gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#2a2a3e');
  bgGrad.addColorStop(0.6, '#1e1e2e');
  bgGrad.addColorStop(1, '#151525');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft background glow
  const glowGrad = ctx.createRadialGradient(cx, cy * 0.5, 0, cx, cy * 0.5, 200 * scale);
  glowGrad.addColorStop(0, `${profile.color}15`);
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Head sway (subtle idle animation)
  const headSway = state.headTilt * 0.3;
  ctx.rotate(headSway * Math.PI / 180);

  // Neck
  ctx.fillStyle = skin.base;
  ctx.beginPath();
  ctx.ellipse(0, 80, 35, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shirt
  const shirtGrad = ctx.createLinearGradient(0, 90, 0, 140);
  shirtGrad.addColorStop(0, `${profile.color}33`);
  shirtGrad.addColorStop(1, `${profile.color}44`);
  ctx.fillStyle = shirtGrad;
  ctx.beginPath();
  ctx.moveTo(-55, 100);
  ctx.quadraticCurveTo(-55, 140, 0, 140);
  ctx.quadraticCurveTo(55, 140, 55, 100);
  ctx.lineTo(45, 90);
  ctx.quadraticCurveTo(0, 100, -45, 90);
  ctx.closePath();
  ctx.fill();

  // Collar
  ctx.fillStyle = '#ffffff22';
  ctx.beginPath();
  ctx.moveTo(-25, 85);
  ctx.lineTo(0, 105);
  ctx.lineTo(25, 85);
  ctx.closePath();
  ctx.fill();

  // Head shape
  ctx.fillStyle = skin.base;
  ctx.beginPath();
  ctx.ellipse(0, -20, 48, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = hairColor;
  if (isFemale) {
    ctx.beginPath();
    ctx.ellipse(0, -65, 50, 30, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-48, -20, 12, 40, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(48, -20, 12, 40, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -25, 50, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(0, -70, 40, 25, 0, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -65, 50, 25, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -30, 50, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -70, 35, 20, 0, Math.PI, 0);
    ctx.fill();
  }

  // Hair highlights
  ctx.fillStyle = `${hairColor}44`;
  ctx.beginPath();
  ctx.ellipse(-20, -68, 15, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(15, -65, 12, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows - dynamic per expression
  let browY = 0;
  let browAngle = 1;
  let browWidth = 2.5;

  switch (state.expression) {
    case 'thinking':
      browY = -4;  // Raised in thought
      browAngle = 0.5;
      break;
    case 'surprised':
      browY = -5;
      browAngle = 1.5;
      break;
    case 'smiling':
      browY = -1;  // Relaxed
      browAngle = 1.2;
      break;
    case 'speaking':
      browY = -0.5;  // Slightly animated
      browAngle = 1.1;
      break;
    case 'listening':
      browY = -0.5;  // Attentive
      browAngle = 0.9;
      break;
    default:
      browY = 0;
      browAngle = 1;
  }

  ctx.strokeStyle = hairColor;
  ctx.lineWidth = browWidth;
  ctx.lineCap = 'round';

  // Left eyebrow
  ctx.beginPath();
  ctx.moveTo(-28, -35 + browY);
  ctx.quadraticCurveTo(-22, -42 + browY * browAngle, -14, -38 + browY);
  ctx.stroke();

  // Right eyebrow
  ctx.beginPath();
  ctx.moveTo(28, -35 + browY);
  ctx.quadraticCurveTo(22, -42 + browY * browAngle, 14, -38 + browY);
  ctx.stroke();

  // Eye whites
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-18, -22, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, -22, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes - open or closed based on blink
  if (state.blinkProgress > 0.5) {
    const eyeOpen = 1 - ((state.blinkProgress - 0.5) * 2);
    const eyeH = Math.max(0.5, 8 * eyeOpen);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-18, -22, 9, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, -22, 9, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (eyeH > 2) {
      // Iris
      const gazeX = state.gazeX * 2;
      const gazeY = state.gazeY * 1.5;
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.ellipse(-18 + gazeX, -22 + gazeY, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(18 + gazeX, -22 + gazeY, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(-18 + gazeX * 1.2, -22 + gazeY * 1.2, 2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(18 + gazeX * 1.2, -22 + gazeY * 1.2, 2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-15 + gazeX, -24 + gazeY, 1.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(21 + gazeX, -24 + gazeY, 1.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower eyelid line
      ctx.strokeStyle = `${skin.shadow}88`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-18, -15, 8, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(18, -15, 8, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Eyelid crease
    ctx.strokeStyle = `${skin.shadow}66`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-18, -22, 9, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(18, -22, 9, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Under-eye area
  ctx.fillStyle = `${skin.shadow}22`;
  ctx.beginPath();
  ctx.ellipse(-18, -14, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, -14, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.strokeStyle = `${skin.shadow}88`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -15);
  ctx.quadraticCurveTo(0, -8, 6, -3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -15);
  ctx.quadraticCurveTo(0, -8, -6, -3);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = `${skin.shadow}66`;
  ctx.beginPath();
  ctx.ellipse(-5, -2, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, -2, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blush - enhanced for warmth
  const blushIntensity = state.expression === 'smiling' || state.expression === 'listening' ? 0.4 : 0.2;
  ctx.fillStyle = `${skin.blush}${Math.round(blushIntensity * 255).toString(16).padStart(2, '0')}`;
  ctx.beginPath();
  ctx.ellipse(-30, -6, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30, -6, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth / Lips
  const mouthOpen = state.mouthOpen;
  const lipColor = LIP_COLORS[0];

  if (mouthOpen > 0.1) {
    // Open mouth (speaking)
    const mouthH = 3 + mouthOpen * 10;

    // Dark interior of mouth
    ctx.fillStyle = '#4A2020';
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, mouthH * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth (top)
    ctx.fillStyle = '#EFEFEF';
    ctx.beginPath();
    ctx.ellipse(0, 14 - mouthH * 0.25, 11, 3, 0, 0, Math.PI);
    ctx.fill();

    // Upper lip
    ctx.fillStyle = lipColor;
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, 4 + mouthH * 0.15, 0, Math.PI, 0);
    ctx.fill();

    // Lower lip
    ctx.fillStyle = lipColor;
    ctx.beginPath();
    ctx.ellipse(0, 16 + mouthH * 0.3, 13, 3 + mouthH * 0.15, 0, 0, Math.PI);
    ctx.fill();

    // Lip highlight
    ctx.fillStyle = '#FFFFFF22';
    ctx.beginPath();
    ctx.ellipse(-5, 13, 5, 1.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, 13, 4, 1, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Closed mouth (with expression)
    let mouthW = 13;
    let mouthY = 14;
    let smileCurve = -1;
    const showTeeth = false;

    if (state.expression === 'smiling') {
      mouthW = 18;
      smileCurve = -3;
    } else if (state.expression === 'thinking') {
      mouthW = 11;
      smileCurve = 0.5;
    } else if (state.expression === 'surprised') {
      mouthW = 10;
      smileCurve = 0;
    }

    // Lips fill
    ctx.fillStyle = lipColor;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner lip highlight
    ctx.fillStyle = `${lipColor}88`;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW - 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile - upper lip curve
    ctx.strokeStyle = `${lipColor}CC`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mouthW + 2, mouthY);
    ctx.quadraticCurveTo(0, mouthY + smileCurve, mouthW - 2, mouthY);
    ctx.stroke();

    // Show teeth for big smile
    if (state.expression === 'smiling' && mouthW > 14) {
      ctx.fillStyle = '#EFEFEF';
      ctx.beginPath();
      ctx.ellipse(0, mouthY + 1, mouthW - 4, 2, 0, 0, Math.PI);
      ctx.fill();
    }

    // Smile lines (nasolabial fold emphasis)
    if (state.expression === 'smiling') {
      ctx.strokeStyle = `${skin.shadow}55`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.quadraticCurveTo(-20, 12, -18, 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, 8);
      ctx.quadraticCurveTo(20, 12, 18, 17);
      ctx.stroke();
    }

    // Thinking mouth - slight pucker
    if (state.expression === 'thinking') {
      ctx.fillStyle = `${skin.shadow}33`;
      ctx.beginPath();
      ctx.arc(-3, mouthY + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, mouthY + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nasolabial folds
  ctx.strokeStyle = `${skin.shadow}22`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.quadraticCurveTo(-14, 8, -12, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.quadraticCurveTo(14, 8, 12, 14);
  ctx.stroke();

  // Chin shadow
  ctx.fillStyle = `${skin.shadow}15`;
  ctx.beginPath();
  ctx.ellipse(0, 35, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ear hint
  ctx.fillStyle = skin.base;
  ctx.beginPath();
  ctx.ellipse(-48, -15, 6, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(48, -15, 6, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `${skin.shadow}44`;
  ctx.beginPath();
  ctx.ellipse(-48, -15, 3, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(48, -15, 3, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Name label at bottom
  ctx.fillStyle = '#ffffffcc';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(profile.name, 0, 115);
  ctx.fillStyle = '#ffffff88';
  ctx.font = '9px Arial, sans-serif';
  ctx.fillText(profile.title, 0, 128);

  ctx.restore();
}

export default function AiInterviewerAvatar({ profile, isSpeaking, expression, stateRef, width = 640, height = 480 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastFrameRef = useRef(0);
  const internalState = useRef({
    blinkProgress: 0,
    targetBlink: 0,
    gazeX: 0,
    gazeY: 0,
    targetGazeX: 0,
    targetGazeY: 0,
    mouthOpen: 0,
    targetMouthOpen: 0,
    headTilt: 0,
    targetHeadTilt: 0,
    expression: 'neutral',
    lastBlink: 0,
    nextBlink: 2000 + Math.random() * 4000,
    audioAmplitude: 0
  });

  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = internalState.current;

    const dt = Math.min((timestamp - lastFrameRef.current) / 16.667, 4);
    lastFrameRef.current = timestamp;

    // Blink timer
    if (!s.isBlinking && timestamp - s.lastBlink > s.nextBlink) {
      s.isBlinking = true;
      s.blinkProgress = 0;
    }

    // Blink animation (takes ~150ms)
    if (s.isBlinking) {
      s.blinkProgress += dt * 0.04;
      if (s.blinkProgress >= 1) {
        s.isBlinking = false;
        s.blinkProgress = 0;
        s.lastBlink = timestamp;
        s.nextBlink = 3000 + Math.random() * 5000;
      }
    }

    // Smooth gaze transitions - different behavior per expression
    if (expression === 'thinking') {
      // Look up and to the side when thinking
      s.targetGazeX = 1.5;
      s.targetGazeY = -1.5;
    } else if (expression === 'speaking') {
      // Direct eye contact when speaking
      if (Math.random() < 0.003) {
        s.targetGazeX = (Math.random() - 0.5) * 2;
        s.targetGazeY = (Math.random() - 0.5) * 1;
      }
    } else if (expression === 'listening') {
      // Soft gaze when listening, occasional head tilt
      if (Math.random() < 0.004) {
        s.targetGazeX = (Math.random() - 0.5) * 2.5;
        s.targetGazeY = (Math.random() - 0.5) * 1.5;
      }
    } else {
      // Idle - random shifts
      if (Math.random() < 0.005) {
        s.targetGazeX = (Math.random() - 0.5) * 3;
        s.targetGazeY = (Math.random() - 0.5) * 2 - 0.5;
      }
    }
    s.gazeX += (s.targetGazeX - s.gazeX) * 0.02 * dt;
    s.gazeY += (s.targetGazeY - s.gazeY) * 0.02 * dt;

    // Mouth movement (smoothly follow target)
    if (stateRef?.current) {
      s.targetMouthOpen = stateRef.current.mouthOpen;
    } else {
      s.targetMouthOpen = isSpeaking ? 0.3 + s.audioAmplitude * 0.7 : 0;
    }
    s.mouthOpen += (s.targetMouthOpen - s.mouthOpen) * 0.1 * dt;

    // Head tilt (expression-aware)
    if (isSpeaking || expression === 'speaking') {
      s.targetHeadTilt = Math.sin(timestamp * 0.002) * 1.5 + Math.cos(timestamp * 0.003) * 1;
    } else if (expression === 'listening') {
      // Subtle nodding when listening
      s.targetHeadTilt = Math.sin(timestamp * 0.0025) * 1.5 + Math.sin(timestamp * 0.0008) * 2;
    } else if (expression === 'thinking') {
      // Slight tilt when thinking
      s.targetHeadTilt = 3 + Math.sin(timestamp * 0.001) * 1;
    } else {
      // Idle sway
      s.targetHeadTilt = Math.sin(timestamp * 0.001) * 1;
    }
    s.headTilt += (s.targetHeadTilt - s.headTilt) * 0.02 * dt;

    // Expression
    s.expression = expression || 'neutral';

    // Audio amplitude decay
    s.audioAmplitude *= 0.95;

    drawFace(ctx, canvas.width, canvas.height, profile, s);

    if (stateRef) {
      stateRef.current = { mouthOpen: s.mouthOpen, expression: s.expression };
    }

    animRef.current = requestAnimationFrame(animate);
  }, [profile, isSpeaking, expression, stateRef]);

  useEffect(() => {
    lastFrameRef.current = performance.now();
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animate]);

  // Expose setAudioAmplitude method
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setAudioAmplitude = (amp) => {
        internalState.current.audioAmplitude = Math.min(1, Math.max(0, amp));
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-cover"
      style={{ borderRadius: 0 }}
    />
  );
}
