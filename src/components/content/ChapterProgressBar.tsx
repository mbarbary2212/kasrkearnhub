import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  // Legacy props for backward compatibility
  resourcesProgress?: number;
  resourcesCompleted?: number;
  resourcesTotal?: number;
}

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
}: ChapterProgressBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-48" />
      </div>
    );
  }

  const hasContent = practiceTotal > 0 || videosTotal > 0;
  const hasPractice = practiceTotal > 0;
  const hasVideos = videosTotal > 0;
  const hasBreakdownContent = showBreakdown && hasContent && (hasPractice || hasVideos);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        {/* Main Progress Bar - Overall */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium">Your progress in this chapter</span>
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
          <Progress value={hasContent ? totalProgress : 0} className="h-2.5" />
          
          {/* Helper text - shown on mobile only when collapsed */}
          {hasBreakdownContent && !isOpen && (
            <p className="text-[11px] text-muted-foreground/70">
              Based on Practice (60%) + Videos (40%)
            </p>
          )}
        </div>

        {/* Collapsible Breakdown */}
        <CollapsibleContent>
          {hasBreakdownContent && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground/80">
                Overall Progress is based on Practice completion (60%) and Video watching (40%). 
                It is not based on grades.
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
