import { useState, useEffect } from 'react';
import logoIcon from '@/assets/kalm-logo-icon.png';

interface SplashScreenProps {
  onDismiss: () => void;
}

const PILLARS = [{
  title: 'Learn',
  description: 'Resources • Practice • Test yourself'
}, {
  title: 'Connect',
  description: 'Feedback • Questions • Discussion'
}, {
  title: 'Formative assessment',
  description: 'Track progress • Identify gaps'
}, {
  title: 'Personal coach',
  description: 'Guidance • Smart recommendations'
}];

export default function SplashScreen({
  onDismiss
}: SplashScreenProps) {
  const [currentPillar, setCurrentPillar] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const FADE_IN = 600;
    const HOLD = 2000;
    const FADE_OUT = 600;
    const CYCLE = FADE_IN + HOLD + FADE_OUT; // 3200ms

    const interval = setInterval(() => {
      // Start fade out
      setIsVisible(false);

      // After fade out completes, advance and fade in
      setTimeout(() => {
        setCurrentPillar(prev => (prev + 1) % 4);
        setIsVisible(true);
      }, FADE_OUT);
    }, CYCLE);
    return () => clearInterval(interval);
  }, []);

  const animationStyle = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
    filter: isVisible ? 'blur(0px)' : 'blur(4px)',
    transition: 'opacity 600ms ease-out, transform 600ms ease-out, filter 600ms ease-out',
    willChange: 'opacity, transform, filter' as const
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-white p-2 md:p-3 cursor-pointer animate-fade-in" 
      onClick={onDismiss}
    >
      {/* Desktop/Tablet: CSS background image */}
      <div className="hidden md:flex relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-[url('/splash-landscape.png')] bg-cover bg-center bg-no-repeat flex-col items-center justify-center">
        {/* Logo + Title + SEO Text - left column */}
        <div className="absolute top-6 left-6 z-10 max-w-md">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <img 
              src={logoIcon} 
              alt="KALM Hub Logo" 
              className="w-12 h-12 md:w-14 md:h-14 drop-shadow-lg"
            />
            <h1 className="text-4xl md:text-5xl font-heading font-bold drop-shadow-lg">
              <span className="text-white" style={{ textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)' }}>KALM</span>
              <span className="text-[#C9A227] text-3xl md:text-4xl" style={{ textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)' }}> Hub</span>
            </h1>
          </div>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/90 font-medium mt-3 drop-shadow-md" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Kasr Al-Ainy Learning & Mentorship Hub
          </p>
          
          {/* SEO paragraph */}
          <p className="text-sm md:text-base text-white/80 mt-2 leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            KALM Hub is an academic digital platform designed to support medical 
            students and trainees at Kasr Al-Ainy through structured learning 
            resources, formative assessment, mentorship, and progress tracking.
          </p>
        </div>

        {/* Pillar overlay - positioned lower to avoid SEO text */}
        <div className="absolute bottom-24 left-12" style={animationStyle}>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-8 py-5 max-w-md text-left">
            <h2 className="text-xl font-medium text-white">
              {PILLARS[currentPillar].title}
            </h2>
            <p className="text-base text-white/80 mt-1">
              {PILLARS[currentPillar].description}
            </p>
          </div>
        </div>

        {/* Login button */}
        <button 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-lg font-medium hover:bg-white/20 transition-colors" 
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click to log in
        </button>
      </div>

      {/* Mobile: CSS background image */}
      <div className="md:hidden relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-[url('/splash-portrait.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center">
        {/* Logo + Title + SEO Text - left column */}
        <div className="absolute top-4 left-4 z-10 max-w-[200px]">
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <img 
              src={logoIcon} 
              alt="KALM Hub Logo" 
              className="w-8 h-8 drop-shadow-lg"
            />
            <h1 className="text-2xl font-heading font-bold drop-shadow-lg">
              <span className="text-white" style={{ textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)' }}>KALM</span>
              <span className="text-[#C9A227] text-xl" style={{ textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)' }}> Hub</span>
            </h1>
          </div>
          
          {/* Subtitle */}
          <p className="text-xs text-white/90 font-medium mt-2 drop-shadow-md" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Kasr Al-Ainy Learning & Mentorship Hub
          </p>
          
          {/* SEO paragraph */}
          <p className="text-[10px] text-white/80 mt-1 leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            KALM Hub is an academic digital platform designed to support medical 
            students and trainees at Kasr Al-Ainy.
          </p>
        </div>

        {/* Pillar overlay - positioned lower */}
        <div className="absolute bottom-20 left-2" style={animationStyle}>
          <div className="bg-black/40 backdrop-blur-md px-3 py-2 max-w-[180px] text-left rounded-sm">
            <h2 className="text-xs font-medium text-white">
              {PILLARS[currentPillar].title}
            </h2>
            <p className="text-[10px] text-white/80 mt-0.5">
              {PILLARS[currentPillar].description}
            </p>
          </div>
        </div>

        {/* Login button */}
        <button 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors" 
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click to log in
        </button>
      </div>
    </div>
  );
}
