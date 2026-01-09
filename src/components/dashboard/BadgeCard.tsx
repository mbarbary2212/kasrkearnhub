import { Badge } from '@/hooks/useBadges';
import { cn } from '@/lib/utils';
import { 
  Award, Baby, Flame, Target, Crown, BookCheck, Zap, Brain, Star,
  Calendar, CalendarCheck, CalendarHeart, Play, Tv, PieChart, GraduationCap, Lock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'award': Award,
  'baby': Baby,
  'flame': Flame,
  'target': Target,
  'crown': Crown,
  'book-check': BookCheck,
  'zap': Zap,
  'brain': Brain,
  'star': Star,
  'calendar': Calendar,
  'calendar-check': CalendarCheck,
  'calendar-heart': CalendarHeart,
  'play': Play,
  'tv': Tv,
  'pie-chart': PieChart,
  'graduation-cap': GraduationCap,
};

const tierColors = {
  1: 'from-amber-600 to-amber-700', // Bronze
  2: 'from-slate-400 to-slate-500', // Silver
  3: 'from-yellow-400 to-yellow-500', // Gold
};

const tierBorders = {
  1: 'border-amber-600/50',
  2: 'border-slate-400/50',
  3: 'border-yellow-400/50',
};

const tierNames = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
};

interface BadgeCardProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function BadgeCard({ 
  badge, 
  earned = false, 
  earnedAt,
  size = 'md',
  showTooltip = true,
}: BadgeCardProps) {
  const IconComponent = iconMap[badge.icon_name] || Award;
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  const content = (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center transition-all',
        sizeClasses[size],
        earned 
          ? `bg-gradient-to-br ${tierColors[badge.tier as 1 | 2 | 3]} shadow-lg` 
          : 'bg-muted/50 border-2 border-dashed border-muted-foreground/30',
        earned && tierBorders[badge.tier as 1 | 2 | 3],
      )}
    >
      {earned ? (
        <IconComponent className={cn(iconSizes[size], 'text-white drop-shadow-sm')} />
      ) : (
        <Lock className={cn(iconSizes[size], 'text-muted-foreground/50')} />
      )}
      
      {/* Tier indicator for earned badges */}
      {earned && size !== 'sm' && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center shadow-sm border">
          <span className="text-[10px] font-bold text-foreground">
            {badge.tier}
          </span>
        </div>
      )}
    </div>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-semibold">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
            {earned && earnedAt && (
              <p className="text-xs text-primary">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
            {!earned && (
              <p className="text-xs text-muted-foreground italic">
                {tierNames[badge.tier as 1 | 2 | 3]} tier • Locked
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
