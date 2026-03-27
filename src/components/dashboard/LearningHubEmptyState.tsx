import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningHubEmptyStateProps {
  onSelectModule: () => void;
  highlight?: boolean;
}

export function LearningHubEmptyState({ onSelectModule, highlight }: LearningHubEmptyStateProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [showCue, setShowCue] = useState(true);

  useEffect(() => {
    if (highlight && bannerRef.current) {
      bannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

  // Stop the cue animation after ~3 pulses (2.4s)
  useEffect(() => {
    const timer = setTimeout(() => setShowCue(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={bannerRef}
      className={cn(
        'relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 overflow-hidden transition-all duration-500',
        highlight && 'ring-2 ring-primary/40 animate-pulse'
      )}
    >
      {/* Decorative background circle */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />

      {/* Directional cue pointing up-right toward module selector */}
      {showCue && (
        <div className="absolute top-3 right-4 flex items-center gap-1 animate-[bounce_0.8s_ease-in-out_3]">
          <span className="text-[10px] font-medium text-primary/70">Select above</span>
          <ArrowUpRight className="w-4 h-4 text-primary/70" />
        </div>
      )}

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-1">Select a Module</h3>
          <p className="text-sm text-muted-foreground">
            Choose a module from the dropdown above to view your progress, study plan, and assessments.
          </p>
        </div>

        <Button onClick={onSelectModule} className="gap-2 flex-shrink-0">
          Select Module
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
