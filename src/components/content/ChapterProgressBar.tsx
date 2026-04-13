import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { ChapterProgressBarSkeleton } from '@/components/ui/skeletons';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Video, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Circle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type MasteryLevel } from '@/lib/readinessCalculator';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  started: 'Getting started',
  building: 'Building',
  ready: 'Ready',
  strong: 'Strong',
  needs_attention: 'Needs attention',
};

const STATUS_BAR_COLORS: Record<string, string> = {
  not_started: '',
  started: 'bg-blue-400',
  building: 'bg-amber-400',
  ready: 'bg-green-500',
  strong: 'bg-emerald-500',
  needs_attention: 'bg-red-500',
};

interface ChapterProgressBarProps {
  totalProgress: number;
  practiceProgress: number;
  videoProgress: number;
  practiceCompleted: number;
  practiceTotal: number;
  videosCompleted: number;
  videosTotal: number;
  isLoading?: boolean;
  showBreakdown?: boolean;
  // Mastery indicator props
  masteryLevel?: MasteryLevel;
  masteryLabel?: string;
  /** Chapter readiness status for colour-coding */
  status?: string;
  // Legacy props for backward compatibility
  resourcesProgress?: number;
  resourcesCompleted?: number;
  resourcesTotal?: number;
}

const masteryConfig: Record<MasteryLevel, { icon: typeof CheckCircle2; color: string; bgColor: string }> = {
  mastered: { 
    icon: CheckCircle2, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  needs_improvement: { 
    icon: AlertCircle, 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  not_attempted: { 
    icon: Circle, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function ChapterProgressBar({
  totalProgress,
  practiceProgress,
  videoProgress,
  practiceCompleted,
  practiceTotal,
  videosCompleted,
  videosTotal,
  isLoading = false,
  showBreakdown = true,
  masteryLevel,
  masteryLabel,
  status,
}: ChapterProgressBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isLoading) {
    return <ChapterProgressBarSkeleton />;
  }

  const hasContent = practiceTotal > 0 || videosTotal > 0;
  const hasPractice = practiceTotal > 0;
  const hasVideos = videosTotal > 0;
  const hasBreakdownContent = showBreakdown && hasContent && (hasPractice || hasVideos);
  const showMastery = masteryLevel && masteryLevel !== 'not_attempted';
  const config = masteryLevel ? masteryConfig[masteryLevel] : null;

  const statusLabel = status && STATUS_LABELS[status] ? STATUS_LABELS[status] : null;
  const barColorClass = status && STATUS_BAR_COLORS[status] ? STATUS_BAR_COLORS[status] : '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2 min-w-0 overflow-hidden">
        {/* Main Progress Bar - Overall */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">Your progress in this chapter</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Progress combines Practice (60%) and Videos (40%). A single video can significantly impact your progress.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Mastery Badge */}
              {showMastery && config && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs px-1.5 py-0 gap-1", config.bgColor, config.color)}
                >
                  <config.icon className="w-3 h-3" />
                  {masteryLabel || (masteryLevel === 'mastered' ? 'Good' : 'Review')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-semibold",
                hasContent && totalProgress === 100 && "text-accent"
              )}>
                {hasContent ? `${totalProgress}%` : 'No content yet'}
              </span>
              {hasBreakdownContent && (
                <CollapsibleTrigger asChild>
                  <button 
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                    aria-label={isOpen ? "Hide details" : "Show details"}
                  >
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
          {/* Progress bar with status colour */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                barColorClass || "bg-primary"
              )}
              style={{ width: `${hasContent ? Math.min(totalProgress, 100) : 0}%` }}
            />
          </div>
          
          {/* Status label + helper text */}
          <div className="flex items-center justify-between">
            {hasBreakdownContent && !isOpen ? (
              <p className="text-[11px] text-muted-foreground/70">
                Based on Practice (60%) + Videos (40%)
              </p>
            ) : <span />}
            {statusLabel && (
              <span className={cn(
                "text-[11px] font-medium",
                status === 'needs_attention' && "text-red-600 dark:text-red-400",
                status === 'strong' && "text-emerald-600 dark:text-emerald-400",
                status === 'ready' && "text-green-600 dark:text-green-400",
                status === 'building' && "text-amber-600 dark:text-amber-400",
                status === 'started' && "text-blue-600 dark:text-blue-400",
                (!status || status === 'not_started') && "text-muted-foreground",
              )}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Breakdown */}
        <CollapsibleContent>
          {hasBreakdownContent && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground/80">
                Overall Progress is based on Practice completion (60%) and Video watching (40%). 
                {showMastery && ' The mastery badge shows your performance quality on completed items.'}
              </p>
              
              <div className="space-y-2">
                {/* Practice Progress (60%) */}
                {hasPractice && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Practice</span>
                        <span className="text-muted-foreground/60 text-[10px]">(60%)</span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        practiceProgress === 100 && "text-accent"
                      )}>
                        {practiceCompleted}/{practiceTotal} completed
                      </span>
                    </div>
                    <Progress value={practiceProgress} className="h-1.5" />
                  </div>
                )}

                {/* Video Progress (40%) */}
                {hasVideos && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        <span>Videos</span>
                        <span className="text-muted-foreground/60 text-[10px]">(40%)</span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        videoProgress >= 100 && "text-accent"
                      )}>
                        {videoProgress}% watched
                      </span>
                    </div>
                    <Progress value={videoProgress} className="h-1.5" />
                  </div>
                )}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
