import { useEffect, useState } from 'react';
import { useBadgeCelebration } from '@/contexts/BadgeCelebrationContext';
import { Trophy, Star, Zap, Target, Award, Medal, Flame, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  award: Award,
  medal: Medal,
  flame: Flame,
  'book-open': BookOpen,
};

// Generate confetti particles
function ConfettiParticle({ index }: { index: number }) {
  const colors = [
    'bg-yellow-400',
    'bg-amber-500',
    'bg-orange-400',
    'bg-primary',
    'bg-accent',
    'bg-pink-400',
    'bg-purple-400',
  ];
  
  const angle = (index / 12) * 360;
  const distance = 100 + Math.random() * 100;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const size = 8 + Math.random() * 8;
  const delay = Math.random() * 0.3;
  
  return (
    <div
      className={cn(
        'absolute rounded-full opacity-0',
        colors[index % colors.length]
      )}
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `confetti-burst 0.8s ease-out ${delay}s forwards`,
        '--x': `${x}px`,
        '--y': `${y}px`,
      } as React.CSSProperties}
    />
  );
}

export function BadgeCelebration() {
  const { currentBadge, isShowing, dismiss } = useBadgeCelebration();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isShowing && currentBadge) {
      setVisible(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isShowing, currentBadge, dismiss]);

  if (!currentBadge || !visible) return null;

  const IconComponent = iconMap[currentBadge.icon_name] || Trophy;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={dismiss}
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Content */}
      <div className="relative flex flex-col items-center gap-4 p-8">
        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
        
        {/* Glow ring */}
        <div className="absolute w-48 h-48 rounded-full bg-yellow-500/20 animate-ping" />
        
        {/* Badge icon container */}
        <div 
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500",
            "shadow-[0_0_60px_rgba(245,158,11,0.5)]",
            "animate-badge-bounce"
          )}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
          </div>
          
          <IconComponent className="w-16 h-16 text-white drop-shadow-lg" />
        </div>
        
        {/* Badge name */}
        <div 
          className="text-center animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}
        >
          <h2 className="text-3xl font-heading font-bold text-white mb-2 drop-shadow-lg">
            {currentBadge.name}
          </h2>
          <p className="text-lg text-white/90 max-w-xs drop-shadow">
            {currentBadge.description}
          </p>
        </div>
        
        {/* Tap to dismiss hint */}
        <p 
          className="text-sm text-white/60 mt-4 animate-pulse"
          style={{ animationDelay: '2s' }}
        >
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
