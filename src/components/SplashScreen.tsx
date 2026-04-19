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
    const FADE_IN = 500;
    const HOLD = 2000;
    const FADE_OUT = 500;
    const CYCLE = FADE_IN + HOLD + FADE_OUT; // 3000ms

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
    transition: 'opacity 500ms ease-out, transform 500ms ease-out, filter 500ms ease-out',
    willChange: 'opacity, transform, filter' as const
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white p-2 md:p-3 cursor-pointer animate-fade-in" onClick={onDismiss}>
      {/* Desktop/Tablet Layout */}
      <div className="hidden md:flex relative w-full h-full rounded-lg overflow-hidden shadow-lg flex-col items-center justify-center bg-white">
        {/* Responsive background image */}
        <picture className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] rounded-lg overflow-hidden flex items-start justify-center">
          <source media="(max-width: 768px)" srcSet="/splash-portrait.webp" />
          <source media="(min-width: 769px)" srcSet="/splash-landscape.webp" />
          <img
            src="/splash-landscape.webp"
            alt="KALM Hub background"
            fetchPriority="high"
            className="w-full h-full object-contain object-top"
          />
        </picture>

        {/* Logo + Title - upper left corner */}
        <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
          <img src={logoIcon} alt="KALM Hub Logo" className="w-12 h-12 md:w-14 md:h-14 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-heading font-bold drop-shadow-lg">
            <span className="text-white" style={{
              textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)'
            }}>KALM</span>
            <span className="text-[#C9A227] text-3xl md:text-4xl" style={{
              textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)'
            }}> Hub</span>
          </h1>
        </div>
        
        {/* SEO Text + Login button - center left, vertically centered */}
        <div className="absolute top-1/2 left-6 -translate-y-1/2 z-10 max-w-xs text-left">
          <p className="text-lg md:text-xl text-black font-medium drop-shadow-sm">
            Knowledge, Assessment, Learning & Mentorship — For Medical Students
          </p>
          <p className="text-sm text-black/80 mt-2 leading-relaxed max-w-[240px]">
            The all-in-one learning hub for medical students.
          </p>
          
          {/* Login button */}
          <button className="mt-4 px-6 py-2 bg-white/20 backdrop-blur-sm border border-black/30 text-black rounded-full text-sm font-medium hover:bg-white/40 transition-colors" onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}>
            Click to log in
          </button>
        </div>

        {/* Pillar overlay - upper right corner */}
        <div className="absolute top-6 right-6 z-10" style={animationStyle}>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-6 py-4 max-w-xs text-left">
            <h2 className="text-lg font-medium text-white">
              {PILLARS[currentPillar].title}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {PILLARS[currentPillar].description}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden relative w-full h-full rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-center bg-white">
        {/* Responsive background image */}
        <picture className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] rounded-lg overflow-hidden">
          <source media="(max-width: 768px)" srcSet="/splash-portrait.webp" />
          <source media="(min-width: 769px)" srcSet="/splash-landscape.webp" />
          <img
            src="/splash-portrait.webp"
            alt="KALM Hub background"
            fetchPriority="high"
            className="w-full h-full object-cover object-top"
          />
        </picture>

        {/* Logo + Title - upper left corner */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <img src={logoIcon} alt="KALM Hub Logo" className="w-8 h-8 drop-shadow-lg" />
          <h1 className="text-2xl font-heading font-bold drop-shadow-lg">
            <span className="text-white" style={{
              textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)'
            }}>KALM</span>
            <span className="text-[#C9A227] text-xl" style={{
              textShadow: '1px 1px 0 #333, -1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 2px 2px 4px rgba(0,0,0,0.5)'
            }}> Hub</span>
          </h1>
        </div>
        
        {/* SEO Text + Login button - below logo */}
        <div className="absolute top-20 left-4 z-10 max-w-[60%] text-left">
          <p className="text-xs text-black font-medium drop-shadow-sm leading-snug">
            Knowledge, Assessment, Learning & Mentorship — For Medical Students
          </p>
          <p className="text-[10px] text-black/80 mt-1 leading-relaxed">
            The all-in-one learning hub for medical students.
          </p>
          
          {/* Login button */}
          <button className="mt-3 px-4 py-1.5 bg-white/20 backdrop-blur-sm border border-black/30 text-black rounded-full text-xs font-medium hover:bg-white/40 transition-colors" onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}>
            Click to log in
          </button>
        </div>

        {/* Pillar overlay - upper right corner */}
        <div className="absolute top-4 right-4 z-10" style={animationStyle}>
          
        </div>
      </div>
    </div>
  );
}
