import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, googleLogin, register, reset, updateProfile } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';

const colorPalette = [
  { c: '#1B6C42', weight: 0.40 }, // Forest Green
  { c: '#2D8F5C', weight: 0.30 }, // Light Forest Green
  { c: '#64B08F', weight: 0.20 }, // Soft Mint Green
  { c: '#C4A46A', weight: 0.10 }  // Soft Gold/Champagne accent
];

function getRandomColor() {
  let r = Math.random();
  let sum = 0;
  for (let p of colorPalette) {
    sum += p.weight;
    if (r <= sum) return p.c;
  }
  return colorPalette[0].c;
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#_";

export default function Landing({ autoOpen }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const stickyRef = useRef(null);
  const statsRef = useRef(null);

  const { user, isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

  // States
  const [heroTitle1, setHeroTitle1] = useState('Master Your');
  const [heroTitle2, setHeroTitle2] = useState('Interviews');
  const [activeStep, setActiveStep] = useState('01');
  const [stats, setStats] = useState({ mockInterviews: 0, questions: 0, roles: 0, rating: 0.0 });
  const [statsTriggered, setStatsTriggered] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignInMode, setIsSignInMode] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [modalRoleQuery, setModalRoleQuery] = useState('');
  const [modalExperience, setModalExperience] = useState('');
  const [modalSkillInput, setModalSkillInput] = useState('');
  const [modalSkills, setModalSkills] = useState([]);

  // Auth Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: ''
  });
  const { name, email, password, password2 } = formData;
  const [isRegistering, setIsRegistering] = useState(false);

  // Refs
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  // 1. Text Scramble
  const scrambleText = (finalString, callback) => {
    let start = Date.now();
    const duration = 1200;
    const interval = setInterval(() => {
      const progress = (Date.now() - start) / duration;
      if (progress >= 1) {
        callback(finalString);
        clearInterval(interval);
        return;
      }
      const scrambled = finalString.split('').map((char, index) => {
        if (char === ' ' || char === '\n') return char;
        if (progress > index / finalString.length) return char;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      callback(scrambled);
    }, 30);
  };

  useEffect(() => {
    setTimeout(() => {
      scrambleText('Master Your', setHeroTitle1);
      setTimeout(() => scrambleText('Interviews', setHeroTitle2), 200);
    }, 300);
  }, []);

  // Handle auth states
  useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
      setIsRegistering(false);
    }

    if (isSuccess && user) {
      if (isRegistering) {
        // Now update the profile with onboarding info
        dispatch(updateProfile({
          targetRole: modalRoleQuery,
          experience: modalExperience,
          skills: modalSkills
        }));
        setIsRegistering(false);
        toast.success('Onboarding complete!');
      } else {
        toast.success(isSignInMode ? 'Welcome back!' : 'Account created!');
      }
      closeModal();
      dispatch(reset());
      navigate('/');
    }
  }, [user, isError, isSuccess, message, navigate, dispatch, isRegistering, modalRoleQuery, modalExperience, modalSkills, isSignInMode]);

  // Handle autoOpen parameter
  useEffect(() => {
    if (autoOpen) {
      openModal(autoOpen);
    }
  }, [autoOpen]);
  // 2. 3D Canvas node network animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let width = window.innerWidth;
    let height = window.innerHeight;
    let nodes = [];
    let rotationAngle = 0;
    let animationFrameId;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial nodes
    const numNodes = 130;
    const clusterCenters = [
      { x: 200, y: -100, z: 100 }, { x: -250, y: 150, z: -50 },
      { x: 0, y: -200, z: -200 }, { x: 300, y: 200, z: 150 },
      { x: -150, y: -250, z: 200 }, { x: 100, y: 300, z: -100 }
    ];

    for (let i = 0; i < numNodes; i++) {
      const cluster = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
      const spread = 180;
      nodes.push({
        ox: cluster.x + (Math.random() - 0.5) * spread,
        oy: cluster.y + (Math.random() - 0.5) * spread,
        oz: cluster.z + (Math.random() - 0.5) * spread,
        color: getRandomColor(),
        radius: 1 + Math.random() * 4,
        seed: Math.random() * 100
      });
    }

    const drawGraph = () => {
      ctx.fillStyle = '#E9EFED';
      ctx.fillRect(0, 0, width, height);

      rotationAngle += 0.0008;
      const focalLength = 1000;
      const cx = width / 2;
      const cy = height / 2;

      let projectedNodes = [];
      const time = Date.now() * 0.001;

      nodes.forEach((node) => {
        let y = node.oy + Math.sin(time * 0.4 + node.seed) * 15;
        let x = node.ox * Math.cos(rotationAngle) - node.oz * Math.sin(rotationAngle);
        let z = node.oz * Math.cos(rotationAngle) + node.ox * Math.sin(rotationAngle);

        x -= mouseRef.current.x * (z + focalLength) * 0.02;
        y -= mouseRef.current.y * (z + focalLength) * 0.02;

        const scale = focalLength / (focalLength + z);
        const x2d = x * scale + cx;
        const y2d = y * scale + cy - scrollRef.current * 0.1;

        projectedNodes.push({ x: x2d, y: y2d, z, scale, node });
      });

      projectedNodes.sort((a, b) => b.z - a.z);

      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p1 = projectedNodes[i];
          const p2 = projectedNodes[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 70 * p1.scale) {
            const alpha = (1 - dist / (70 * p1.scale)) * 0.15 * Math.min(1, p1.scale);
            ctx.strokeStyle = `rgba(156, 163, 175, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      projectedNodes.forEach(p => {
        if (p.z > -focalLength) {
          const breathe = 0.92 + 0.08 * Math.sin(time * 0.6 + p.node.seed);
          const r = p.node.radius * p.scale * breathe;

          if (r > 0.1) {
            const fogZ = 500;
            let alpha = 1;
            if (p.z > fogZ) alpha = Math.max(0, 1 - (p.z - fogZ) / 500);

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = p.node.color;
            ctx.fill();
          }
        }
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(drawGraph);
    };

    drawGraph();

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3. Floating Accent Cards Hover/Parallax loop
  useEffect(() => {
    let active = true;
    const floatingCards = document.querySelectorAll('.floating-card');

    const animateFloating = () => {
      if (!active) return;
      const time = Date.now();
      floatingCards.forEach(card => {
        const baseRot = parseFloat(card.getAttribute('data-base-rot') || '0');
        const dur = parseFloat(card.getAttribute('data-float-dur') || '5000');
        const delay = parseFloat(card.getAttribute('data-float-delay') || '0');

        const floatY = Math.sin((time - delay) / dur * Math.PI * 2) * -8;
        const rotateX = -mouseRef.current.y * 5;
        const rotateY = mouseRef.current.x * 5;
        const cardParallax = window.scrollY * -0.3;

        card.style.transform = `perspective(1000px) translateY(${floatY + cardParallax}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${baseRot}deg)`;
      });
      requestAnimationFrame(animateFloating);
    };

    animateFloating();
    return () => {
      active = false;
    };
  }, []);

  // 4. Sticky scroll step cinema tracking (Reduced height to 180vh)
  useEffect(() => {
    const handleStickyScroll = () => {
      const el = stickyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));

      if (progress < 0.33) {
        setActiveStep('01');
      } else if (progress >= 0.33 && progress < 0.66) {
        setActiveStep('02');
      } else {
        setActiveStep('03');
      }
    };

    window.addEventListener('scroll', handleStickyScroll);
    return () => window.removeEventListener('scroll', handleStickyScroll);
  }, []);

  // 5. Counters Viewport Trigger
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsTriggered) {
          setStatsTriggered(true);
          animateCounter('mockInterviews', 5000, 1500, false);
          animateCounter('questions', 10000, 1500, false);
          animateCounter('roles', 20, 1500, false);
          animateCounter('rating', 4.8, 1500, true);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(el);

    const animateCounter = (field, target, duration, isFloat) => {
      const startTime = performance.now();
      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const p = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        const current = target * ease;

        setStats(prev => ({
          ...prev,
          [field]: isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current)
        }));

        if (p < 1) {
          requestAnimationFrame(update);
        } else {
          setStats(prev => ({
            ...prev,
            [field]: target
          }));
        }
      };
      requestAnimationFrame(update);
    };

    return () => observer.disconnect();
  }, [statsTriggered]);

  // 6. Viewport Scroll Fade-in Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-8');
          entry.target.classList.add('opacity-100', 'translate-y-0');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.fade-up-element');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Modal Actions
  const openModal = (mode) => {
    setIsSignInMode(mode === 'signin');
    setModalStep(1);
    setModalSkills([]);
    setFormData({
      name: '',
      email: '',
      password: '',
      password2: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      navigate('/');
    }
  };

  const onFormChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  };

  const handleAuthContinue = (e) => {
    if (e) e.preventDefault();

    if (isSignInMode) {
      if (!email || !password) {
        toast.error('Please fill in all fields');
        return;
      }
      dispatch(login({ email, password }));
    } else {
      if (modalStep === 1) {
        if (!name || !email || !password || !password2) {
          toast.error('Please fill in all fields');
          return;
        }
        if (password !== password2) {
          toast.error('Passwords do not match');
          return;
        }
        setModalStep(2);
      }
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      dispatch(googleLogin(credentialResponse.credential));
    } else {
      toast.error('Google authentication failed');
    }
  };

  const handleLaunchApp = () => {
    setIsRegistering(true);
    dispatch(register({ name, email, password }));
  };

  const addSkill = () => {
    const val = modalSkillInput.trim();
    if (val && !modalSkills.includes(val)) {
      setModalSkills(prev => [...prev, val]);
      setModalSkillInput('');
    }
  };

  const removeSkill = (index) => {
    setModalSkills(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="antialiased text-[#111827] bg-[#E9EFED] font-sans selection:bg-[#1B6C42]/20 selection:text-[#111827]">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full pointer-events-auto opacity-100"></canvas>

        {/* Floating Accent Cards */}
        <div className="absolute inset-0 z-10 hidden lg:block pointer-events-none">
          {/* Card A */}
          <div 
            className="floating-card absolute top-[20%] left-[15%] w-48 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-sm p-4 transition-all duration-700 ease-out" 
            data-base-rot="-6" 
            data-float-delay="0" 
            data-float-dur="5000"
          >
            <span className="font-mono text-xs text-[#3B82F6] font-semibold block mb-3">MERN Prep</span>
            <div className="h-1 rounded-full bg-gray-100 w-full overflow-hidden mb-2">
              <div className="h-full bg-[#3B82F6] w-[55%] rounded-full"></div>
            </div>
            <span className="text-xs text-gray-400 block font-mono font-medium">55% mastered</span>
          </div>

          {/* Card B */}
          <div 
            className="floating-card absolute top-[30%] right-[15%] w-52 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-sm p-5 transition-all duration-700 ease-out" 
            data-base-rot="4" 
            data-float-delay="1000" 
            data-float-dur="6000"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1B6C42]"></div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-mono font-medium">Mastered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#D97706]"></div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-mono font-medium">Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-mono font-medium">Unexplored</span>
              </div>
            </div>
          </div>

          {/* Card C */}
          <div 
            className="floating-card absolute bottom-[25%] left-[10%] w-44 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 transition-all duration-700 ease-out" 
            data-base-rot="3" 
            data-float-delay="500" 
            data-float-dur="4500"
          >
            <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500 font-mono font-medium">Oral Prep</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500 font-mono font-medium">Coding Sandbox</span>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-4xl px-6">
          <div className="fade-up-element opacity-0 translate-y-8 transition-all duration-[900ms] ease-out">
            <div className="inline-flex items-center gap-2.5 bg-white border border-gray-200 shadow-sm rounded-full px-5 py-2">
              <div className="w-2 h-2 rounded-full bg-[#1B6C42] animate-pulse"></div>
              <span className="font-mono text-xs tracking-[0.25em] uppercase text-gray-500 font-semibold">AI-Powered Training</span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-semibold text-[#111827] leading-[1.0] tracking-tight mt-8 transition-all duration-700 fade-up-element opacity-0 translate-y-8 ease-out delay-100">
            <span className="font-sans font-extralight tracking-tight text-gray-800 block mb-2">{heroTitle1}</span>
            <span className="font-playfair italic font-normal bg-gradient-to-r from-[#1B6C42] via-[#2D8F5C] to-[#1B6C42] bg-clip-text text-transparent animate-gradient-shift">
              {heroTitle2}
            </span>
          </h1>

          <p className="font-inter text-lg md:text-xl text-gray-500 max-w-xl mx-auto mt-7 leading-relaxed tracking-wide font-light fade-up-element opacity-0 translate-y-8 ease-out delay-200">
            Simulate real-world technical interviews. Code, speak, and learn through instant AI evaluation and adaptive quizzes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-10 items-center justify-center fade-up-element opacity-0 translate-y-8 ease-out delay-300">
            <button 
              onClick={() => openModal('signup')} 
              className="relative overflow-hidden group bg-[#1B6C42] text-white px-10 py-4 rounded-full font-medium text-base tracking-wide shadow-md hover:shadow-lg hover:bg-[#155A35] transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] btn-shimmer cursor-pointer"
            >
              Get Started
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} 
              className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-10 py-4 rounded-full font-medium text-base shadow-sm transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              See What's Inside <span className="ml-1 opacity-50">↓</span>
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float-indicator flex flex-col items-center">
          <div className="w-[1px] h-14 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
          <span className="font-mono text-xs tracking-[0.4em] text-gray-400 mt-3">SCROLL</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-[#E9EFED] z-10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 fade-up-element opacity-0 translate-y-8 transition-all duration-[900ms] ease-out">
            <span className="font-mono text-xs tracking-[0.3em] text-[#1B6C42] uppercase font-semibold">Features</span>
            <h2 className="font-playfair text-4xl md:text-6xl font-semibold text-[#111827] mt-4 leading-tight tracking-tight">
              Everything You Need<br />to Learn Smarter
            </h2>
            <p className="font-inter text-gray-500 text-lg mt-6 max-w-lg mx-auto font-light leading-relaxed">
              Six powerful tools. One beautiful platform. Built for how your brain actually works.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-100">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#1B6C42]/10">
                  <svg className="w-6 h-6 text-[#1B6C42]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">Interactive Interview Path</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Practice oral responses transcribed automatically via state-of-the-art whisper recognition, or solve algorithms in our live Monaco Editor.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-150">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#D97706]/10">
                  <svg className="w-6 h-6 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.761h-5.02L14 3l-9 11.761h5.021z" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">AI Interviewer (Ollama)</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Receive personalized sessions customized dynamically based on your preferred tech role, difficulty level, and current scores.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-200">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#14B8A6]/10">
                  <svg className="w-6 h-6 text-[#14B8A6]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">Resume & Skill Parsing</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Drop in your resume, bio, or custom texts. Our system automatically extracts relevant skill sets to structure target mock interview sets.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-250">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#EF4444]/10">
                  <svg className="w-6 h-6 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 00-3-3H9m3 3a3 3 0 013-3h.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">Adaptive Coding & Oral Challenges</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Challenge sets that evolve dynamically in real-time. Code test levels rise based on answers, ensuring you train at the exact limit of your ability.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-300">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#8A63D2]/10">
                  <svg className="w-6 h-6 text-[#8A63D2]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">Confidence & Technical Analysis</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Inspect comprehensive reviews with technical scores, confidence grades, ideal code solutions, and line-by-line performance analytics.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="spotlight-card group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm transition-all duration-500 hover:border-gray-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] fade-up-element opacity-0 translate-y-8 ease-out delay-350">
              <div className="spotlight-content">
                <div className="icon-container w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#3B82F6]/10">
                  <svg className="w-6 h-6 text-[#3B82F6]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <h3 className="text-[#111827] font-semibold text-lg mb-3 tracking-tight">Live Sandbox Environment</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">
                  Develop solutions in the code editor, select languages (Python, JS, C++), and prepare exactly like a live technical screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section (Tightened to h-[180vh] for reduced gaps) */}
      <section ref={stickyRef} id="how-it-works" className="relative h-[180vh] bg-[#E9EFED]">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono text-[25vw] sm:text-[250px] font-bold text-gray-900/[0.03] pointer-events-none select-none z-0 transition-all duration-500">
            {activeStep}
          </div>

          <div className="w-full max-w-2xl px-6 relative z-10 text-center">
            {/* Step 1 Content */}
            <div className={`transition-all duration-500 ${activeStep === '01' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-10 scale-95 absolute inset-x-0'}`}>
              <span className="font-mono text-xs tracking-[0.3em] text-[#1B6C42] uppercase mb-4 block font-semibold">Step 01</span>
              <h3 className="font-playfair text-4xl md:text-5xl font-semibold text-[#111827] mb-4 tracking-tight">Configure Profile & Target Role</h3>
              <p className="font-inter text-gray-500 text-lg leading-relaxed font-light mx-auto">
                Authenticate with Google or email, fill in your details, and define your target developer roles in seconds.
              </p>
            </div>

            {/* Step 2 Content */}
            <div className={`transition-all duration-500 ${activeStep === '02' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-10 scale-95 absolute inset-x-0'}`}>
              <span className="font-mono text-xs tracking-[0.3em] text-[#1B6C42] uppercase mb-4 block font-semibold">Step 02</span>
              <h3 className="font-playfair text-4xl md:text-5xl font-semibold text-[#111827] mb-4 tracking-tight">Simulate Verbal & Coding Tests</h3>
              <p className="font-inter text-gray-500 text-lg leading-relaxed font-light mx-auto">
                Trigger mock interviews. Transcribe conceptual verbal replies, solve coding tasks in the integrated Monaco workspace, and track progress.
              </p>
            </div>

            {/* Step 3 Content */}
            <div className={`transition-all duration-500 ${activeStep === '03' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-10 scale-95 absolute inset-x-0'}`}>
              <span className="font-mono text-xs tracking-[0.3em] text-[#1B6C42] uppercase mb-4 block font-semibold">Step 03</span>
              <h3 className="font-playfair text-4xl md:text-5xl font-semibold text-[#111827] mb-4 tracking-tight">Receive AI Feedback & Analysis</h3>
              <p className="font-inter text-gray-500 text-lg leading-relaxed font-light mx-auto">
                Review automated score breakdowns, technical comparisons, code evaluations, and detailed AI insights on how to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section ref={statsRef} className="bg-white/60 backdrop-blur-md border-y border-gray-200 py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16 text-center">
            <div>
              <div className="font-mono text-4xl md:text-5xl font-bold text-[#1B6C42] mb-2">
                {stats.mockInterviews.toLocaleString()}+
              </div>
              <div className="font-inter text-xs text-gray-500 tracking-wider uppercase font-semibold">Mock Interviews</div>
            </div>

            <div>
              <div className="font-mono text-4xl md:text-5xl font-bold text-[#1B6C42] mb-2">
                {stats.questions.toLocaleString()}+
              </div>
              <div className="font-inter text-xs text-gray-500 tracking-wider uppercase font-semibold">Questions Solved</div>
            </div>

            <div>
              <div className="font-mono text-4xl md:text-5xl font-bold text-[#1B6C42] mb-2">
                {stats.roles}+
              </div>
              <div className="font-inter text-xs text-gray-500 tracking-wider uppercase font-semibold">Developer Roles</div>
            </div>

            <div>
              <div className="font-mono text-4xl md:text-5xl font-bold text-[#1B6C42] mb-2">
                {stats.rating.toFixed(1)}★
              </div>
              <div className="font-inter text-xs text-gray-500 tracking-wider uppercase font-semibold">Satisfaction Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section (Reduced padding to py-16 for tighter layout) */}
      <section className="py-16 relative text-center z-10 overflow-hidden bg-[#E9EFED] fade-up-element opacity-0 translate-y-8 transition-all duration-[900ms] ease-out">
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <h2 className="font-playfair text-5xl md:text-7xl font-semibold text-[#111827] tracking-tight leading-[1.05]">
            Ready to <br />
            Master Your Next <span className="bg-gradient-to-r from-[#1B6C42] via-[#2D8F5C] to-[#1B6C42] bg-clip-text text-transparent animate-gradient-shift pr-2">Interview?</span>
          </h2>
          <p className="text-gray-500 text-lg mt-6 font-light">Unlock your dream engineering offer through smart AI preparation.</p>
          
          <div className="mt-10 flex flex-col items-center">
            <button 
              onClick={() => openModal('signup')}
              className="relative overflow-hidden group bg-[#1B6C42] text-white px-10 py-4 rounded-full font-medium text-base tracking-wide shadow-md hover:shadow-lg hover:bg-[#155A35] transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] btn-shimmer cursor-pointer"
            >
              Get Started
            </button>
            <p className="text-gray-400 text-xs mt-4">Free forever for basic prep.</p>
          </div>
        </div>
      </section>

      {/* Professional Multi-Column Footer */}
      <footer className="border-t border-gray-200 bg-[#E9EFED] py-16 px-8 relative z-10 text-gray-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 border-b border-gray-200/60 pb-12 mb-8 fade-up-element opacity-0 translate-y-8 transition-all duration-[900ms] ease-out">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900">
              <img src="/intervai_app_logo.png" alt="IntervAI Logo" className="h-6 w-auto object-contain animate-pulse-slow shrink-0" />
              <span className="font-sans text-xl font-bold tracking-tight text-[#1B6C42]">Interv<span className="text-[#64B08F]">AI</span></span>
            </div>
            <p className="text-xs font-light leading-relaxed text-gray-500">
              Master technical coding and conceptual rounds with customizable AI interviews, speech analytics, and live evaluation algorithms.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold text-gray-900 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-xs font-light">
              <li><button onClick={() => navigate('/login')} className="hover:text-[#1B6C42] transition-colors cursor-pointer bg-transparent border-none p-0 outline-none">Practice Sandbox</button></li>
              <li><button onClick={() => navigate('/')} className="hover:text-[#1B6C42] transition-colors cursor-pointer bg-transparent border-none p-0 outline-none">Dashboard</button></li>
              <li><button onClick={() => navigate('/profile')} className="hover:text-[#1B6C42] transition-colors cursor-pointer bg-transparent border-none p-0 outline-none">Edit Profile</button></li>
              <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#1B6C42] transition-colors cursor-pointer bg-transparent border-none p-0 outline-none">Core Features</button></li>
            </ul>
          </div>

          {/* Interview Roles Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold text-gray-900 uppercase tracking-widest">Target Roles</h4>
            <ul className="space-y-2 text-xs font-light">
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer" onClick={() => openModal('signup')}>MERN Developer</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer" onClick={() => openModal('signup')}>Python Stack</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer" onClick={() => openModal('signup')}>Machine Learning</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer" onClick={() => openModal('signup')}>DevOps & Cloud</span></li>
            </ul>
          </div>

          {/* Resources & Legal Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold text-gray-900 uppercase tracking-widest">Resources</h4>
            <ul className="space-y-2 text-xs font-light">
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer">Support Desk</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer">API References</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-[#1B6C42] transition-colors cursor-pointer">Privacy Policy</span></li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom row */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-light text-gray-400">
          <p>© 2026 IntervAI. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0 font-mono">
            <span>Server: local-v1.0</span>
            <span>•</span>
            <span>LLM: Ollama Mistral</span>
          </div>
        </div>
      </footer>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity duration-300 opacity-100" 
            onClick={closeModal}
          ></div>
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md mx-4 sm:mx-auto z-10">
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 relative overflow-hidden transition-all transform scale-100 opacity-100">
              
              <button 
                onClick={closeModal} 
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all z-20"
              >
                ✕
              </button>

              {/* Progress Dots */}
              {!isSignInMode && (
                <div className="flex justify-center gap-2 mb-8 relative z-10">
                  <div className={`w-10 h-1.5 rounded-full transition-all duration-500 ${modalStep >= 1 ? 'bg-[#1B6C42]' : 'bg-gray-200'}`}></div>
                  <div className={`w-10 h-1.5 rounded-full transition-all duration-500 ${modalStep >= 2 ? 'bg-[#1B6C42]' : 'bg-gray-200'}`}></div>
                  <div className={`w-10 h-1.5 rounded-full transition-all duration-500 ${modalStep >= 3 ? 'bg-[#1B6C42]' : 'bg-gray-200'}`}></div>
                </div>
              )}

              <div className="relative w-full min-h-[320px] flex flex-col justify-center">
                
                {/* Step 1: Auth */}
                {modalStep === 1 && (
                  <form onSubmit={handleAuthContinue} className="w-full flex flex-col justify-center">
                    <h3 className="font-sans text-2xl font-bold text-[#111827] text-center tracking-tight">
                      {isSignInMode ? "Welcome Back" : "Welcome to IntervAI"}
                    </h3>
                    <p className="text-gray-500 text-center text-sm mt-2 font-light">
                      {isSignInMode ? "Sign in to continue your prep" : "Start your interview prep journey"}
                    </p>
                    
                    <div className="w-full flex items-center justify-center mt-6">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => toast.error('Google login failed')}
                        theme="outline"
                        size="large"
                        width="100%"
                        text="continue_with"
                        shape="circle"
                      />
                    </div>

                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-[1px] bg-gray-200"></div>
                      <span className="text-gray-400 text-[11px] font-medium uppercase font-mono">or</span>
                      <div className="flex-1 h-[1px] bg-gray-200"></div>
                    </div>

                    {!isSignInMode && (
                      <input 
                        type="text" 
                        name="name"
                        value={name}
                        onChange={onFormChange}
                        placeholder="Full Name" 
                        className="bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm mb-3"
                        required
                      />
                    )}

                    <input 
                      type="email" 
                      name="email"
                      value={email}
                      onChange={onFormChange}
                      placeholder="your@email.com" 
                      className="bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm mb-3"
                      required
                    />

                    <input 
                      type="password" 
                      name="password"
                      value={password}
                      onChange={onFormChange}
                      placeholder="Password" 
                      className="bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm mb-3"
                      required
                    />

                    {!isSignInMode && (
                      <input 
                        type="password" 
                        name="password2"
                        value={password2}
                        onChange={onFormChange}
                        placeholder="Confirm Password" 
                        className="bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm mb-3"
                        required
                      />
                    )}
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1B6C42] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#155A35] shadow-sm transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        isSignInMode ? "Sign In" : "Continue"
                      )}
                    </button>

                    <p className="text-center text-gray-500 text-xs mt-6 font-light">
                      {isSignInMode ? "Don't have an account? " : "Already have an account? "}
                      <button 
                        type="button"
                        onClick={() => setIsSignInMode(!isSignInMode)} 
                        className="text-[#1B6C42] font-semibold hover:underline cursor-pointer bg-transparent border-none outline-none"
                      >
                        {isSignInMode ? "Get started" : "Sign in"}
                      </button>
                    </p>
                  </form>
                )}

                {/* Step 2: About You */}
                {modalStep === 2 && (
                  <div className="w-full flex flex-col justify-center">
                    <h3 className="font-sans text-2xl font-bold text-[#111827] text-center tracking-tight">About You</h3>
                    <p className="text-gray-500 text-center text-sm mt-2 mb-8 font-light">Help us personalize your preparation</p>
                    
                    <div className="relative mb-4">
                      <input 
                        type="text" 
                        placeholder="Target developer role..." 
                        value={modalRoleQuery}
                        onChange={(e) => setModalRoleQuery(e.target.value)}
                        className="bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm"
                      />
                    </div>

                    <div className="relative mb-6">
                      <select 
                        value={modalExperience}
                        onChange={(e) => setModalExperience(e.target.value)}
                        className="appearance-none bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] w-full outline-none transition-all text-sm cursor-pointer"
                      >
                        <option value="" disabled>Select target experience level</option>
                        <option value="junior">Junior Developer</option>
                        <option value="mid">Mid-Level Developer</option>
                        <option value="senior">Senior Developer</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => setModalStep(3)} 
                      className="w-full bg-[#1B6C42] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#155A35] shadow-sm transition-all duration-300 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Step 3: Skills */}
                {modalStep === 3 && (
                  <div className="w-full flex flex-col justify-center">
                    <h3 className="font-sans text-2xl font-bold text-[#111827] text-center tracking-tight">Your Core Skills</h3>
                    <p className="text-gray-500 text-center text-sm mt-2 mb-8 font-light">What technologies do you want to practice?</p>
                    
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Add a technology (e.g. React)..." 
                        value={modalSkillInput}
                        onChange={(e) => setModalSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addSkill(); }}
                        className="flex-1 bg-gray-50/50 border border-gray-200/60 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 outline-none transition-all text-sm"
                      />
                      <button 
                        onClick={addSkill} 
                        className="bg-[#1B6C42]/10 hover:bg-[#1B6C42]/20 text-[#1B6C42] px-5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 min-h-[42px]">
                      {modalSkills.map((skill, index) => (
                        <div key={index} className="bg-gray-100 border border-gray-200 rounded-full px-3.5 py-1.5 text-gray-700 text-xs flex items-center gap-1.5">
                          <span>{skill}</span>
                          <button 
                            onClick={() => removeSkill(index)} 
                            className="text-gray-400 hover:text-gray-600 font-bold ml-0.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mb-8 flex items-center flex-wrap gap-2">
                      <span className="text-gray-400 text-xs mr-2 font-medium">Popular:</span>
                      {['JavaScript', 'Python', 'React', 'SQL'].map(skill => (
                        <span 
                          key={skill}
                          onClick={() => { if (!modalSkills.includes(skill)) setModalSkills(p => [...p, skill]); }}
                          className="border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-full px-3 py-1.5 text-xs cursor-pointer transition-all"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <button 
                      onClick={handleLaunchApp} 
                      disabled={isLoading}
                      className="w-full bg-[#1B6C42] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#155A35] shadow-sm transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        "Launch IntervAI 🌱"
                      )}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
