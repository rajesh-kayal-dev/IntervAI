export const INTERVIEWER_PROFILES = {
  Female: [
    {
      id: 'sarah',
      name: 'Sarah',
      fullName: 'Sarah Chen',
      title: 'Senior Engineering Manager',
      experience: '12 Years Experience',
      exCompany: 'Ex-Google',
      voice: 'en-IN-NeerjaNeural',
      personality: 'Professional, warm, and detail-oriented. She gives clear feedback and makes candidates feel at ease while maintaining high standards.',
      greetingStyle: 'warm',
      color: '#8B5CF6',
      avatarSeed: 'sarah-chen'
    },
    {
      id: 'neha',
      name: 'Neha',
      fullName: 'Neha Sharma',
      title: 'Engineering Director',
      experience: '14 Years Experience',
      exCompany: 'Ex-Microsoft',
      voice: 'en-IN-NeerjaNeural',
      personality: 'Strategic thinker with a focus on system design and architecture. She challenges candidates with thoughtful, deep-dive questions.',
      greetingStyle: 'professional',
      color: '#EC4899',
      avatarSeed: 'neha-sharma'
    },
    {
      id: 'priya',
      name: 'Priya',
      fullName: 'Priya Patel',
      title: 'Technical Recruiter',
      experience: '8 Years Experience',
      exCompany: 'Ex-Amazon',
      voice: 'en-IN-NeerjaNeural',
      personality: 'Friendly and approachable. She specializes in behavioral interviews and helps candidates showcase their best selves.',
      greetingStyle: 'friendly',
      color: '#06B6D4',
      avatarSeed: 'priya-patel'
    }
  ],
  Male: [
    {
      id: 'david',
      name: 'David',
      fullName: 'David Thompson',
      title: 'VP of Engineering',
      experience: '15 Years Experience',
      exCompany: 'Ex-Google',
      voice: 'en-IN-PrabhatNeural',
      personality: 'Calm, confident, and highly analytical. He asks incisive questions about scalability, architecture, and trade-offs.',
      greetingStyle: 'confident',
      color: '#3B82F6',
      avatarSeed: 'david-thompson'
    },
    {
      id: 'rahul',
      name: 'Rahul',
      fullName: 'Rahul Verma',
      title: 'Senior Staff Engineer',
      experience: '11 Years Experience',
      exCompany: 'Ex-Flipkart',
      voice: 'en-IN-PrabhatNeural',
      personality: 'Deep technical expert who loves exploring the "why" behind decisions. He asks challenging follow-up questions that test real understanding.',
      greetingStyle: 'technical',
      color: '#F59E0B',
      avatarSeed: 'rahul-verma'
    },
    {
      id: 'alex',
      name: 'Alex',
      fullName: 'Alex Rivera',
      title: 'Engineering Manager',
      experience: '10 Years Experience',
      exCompany: 'Ex-Amazon',
      voice: 'en-IN-PrabhatNeural',
      personality: 'Results-oriented with a startup mindset. He focuses on practical experience, ownership, and how candidates handle ambiguity.',
      greetingStyle: 'direct',
      color: '#10B981',
      avatarSeed: 'alex-rivera'
    }
  ]
};

export const COMPANY_CONTEXTS = {
  google: { name: 'Google', style: 'Technical excellence, algorithms, scalability' },
  microsoft: { name: 'Microsoft', style: 'System design, collaboration, product sense' },
  amazon: { name: 'Amazon', style: 'Leadership principles, ownership, scale' },
  flipkart: { name: 'Flipkart', style: 'E-commerce scale, supply chain, high traffic' },
  swiggy: { name: 'Swiggy', style: 'Hyperlocal logistics, real-time systems, growth' },
  zomato: { name: 'Zomato', style: 'Food tech, recommendations, data-driven' },
  razorpay: { name: 'Razorpay', style: 'Payments, fintech, security, reliability' }
};

export function getInterviewer(gender, personalityId) {
  const profiles = INTERVIEWER_PROFILES[gender] || INTERVIEWER_PROFILES.Female;
  return profiles.find(p => p.id === personalityId) || profiles[0];
}

export function generateAvatarSvg(profile, isSpeaking = false, expression = 'neutral') {
  const skinTone = profile.id === 'sarah' ? '#F5D0B8' :
    profile.id === 'neha' ? '#E8C5A0' :
    profile.id === 'priya' ? '#F0C8A0' :
    profile.id === 'david' ? '#F0D0B8' :
    profile.id === 'rahul' ? '#D4A574' :
    profile.id === 'alex' ? '#F0D0B8' : '#F5D0B8';

  const hairColor = profile.id === 'sarah' ? '#1A1A2E' :
    profile.id === 'neha' ? '#2D1810' :
    profile.id === 'priya' ? '#1A1A2E' :
    profile.id === 'david' ? '#4A3728' :
    profile.id === 'rahul' ? '#1A1A2E' :
    profile.id === 'alex' ? '#6B4226' : '#1A1A2E';

  const hairStyle = ['sarah', 'neha', 'priya'].includes(profile.id) ? 'long' : 'short';
  const expressionStyles = {
    neutral: { eyebrowOffset: 0, mouthWidth: 16, mouthHeight: 4 },
    smiling: { eyebrowOffset: -2, mouthWidth: 20, mouthHeight: 8 },
    thinking: { eyebrowOffset: -4, mouthWidth: 14, mouthHeight: 3 },
    listening: { eyebrowOffset: -1, mouthWidth: 15, mouthHeight: 4 }
  };
  const expr = expressionStyles[expression] || expressionStyles.neutral;
  const mouthOpen = isSpeaking ? '6' : String(expr.mouthHeight);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#2a2a3e"/>
          <stop offset="100%" stop-color="#1a1a2e"/>
        </radialGradient>
      </defs>
      <rect width="200" height="240" rx="12" fill="url(#bgGrad)"/>

      <!-- Neck -->
      <rect x="75" y="175" width="50" height="30" rx="8" fill="${skinTone}"/>

      <!-- Shirt/Collar -->
      <rect x="65" y="195" width="70" height="45" rx="4" fill="${profile.color}22"/>
      <path d="M85 195 L100 195 L92 210 Z" fill="#ffffff" opacity="0.3"/>

      <!-- Head -->
      <ellipse cx="100" cy="120" rx="45" ry="52" fill="${skinTone}"/>

      <!-- Hair -->
      ${hairStyle === 'long' ? `
        <path d="M55 110 Q55 65 100 55 Q145 65 145 110 L145 100 Q145 55 100 45 Q55 55 55 100 Z" fill="${hairColor}"/>
        <path d="M55 110 Q50 120 52 135 L55 120 Z" fill="${hairColor}"/>
        <path d="M145 110 Q150 120 148 135 L145 120 Z" fill="${hairColor}"/>
      ` : `
        <path d="M55 110 Q55 55 100 45 Q145 55 145 110 L145 95 Q145 50 100 40 Q55 50 55 95 Z" fill="${hairColor}"/>
      `}

      <!-- Eyebrows -->
      <path d="M72 100 Q78 94 85 98" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M128 100 Q122 94 115 98" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>

      <!-- Eyes -->
      <ellipse cx="80" cy="108" rx="6" ry="5" fill="white"/>
      <ellipse cx="120" cy="108" rx="6" ry="5" fill="white"/>
      <circle cx="81" cy="108" r="3" fill="#2D1810"/>
      <circle cx="121" cy="108" r="3" fill="#2D1810"/>
      <circle cx="82" cy="107" r="1" fill="white"/>
      <circle cx="122" cy="107" r="1" fill="white"/>

      <!-- Nose -->
      <path d="M95 112 Q100 118 105 112" stroke="#C4956A" stroke-width="1.5" fill="none" stroke-linecap="round"/>

      <!-- Mouth -->
      <ellipse cx="100" cy="132" rx="${expr.mouthWidth}" ry="${mouthOpen}" fill="#C97070" stroke="#B06060" stroke-width="0.5"/>

      <!-- Blush (when smiling) -->
      ${expression === 'smiling' ? `
        <ellipse cx="68" cy="120" rx="8" ry="4" fill="#E8A0A0" opacity="0.3"/>
        <ellipse cx="132" cy="120" rx="8" ry="4" fill="#E8A0A0" opacity="0.3"/>
      ` : ''}

      <!-- Name tag -->
      <rect x="50" y="222" width="100" height="16" rx="8" fill="#ffffff" opacity="0.9"/>
      <text x="100" y="233" text-anchor="middle" font-size="8" font-weight="bold" fill="#333" font-family="Arial, sans-serif">${profile.name} · ${profile.title.split(' ')[0]}</text>
    </svg>
  `;
}
