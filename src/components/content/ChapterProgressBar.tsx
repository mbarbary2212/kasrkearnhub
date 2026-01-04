import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Video, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  return (
    <div className="space-y-3">
      {/* Main Progress Bar - Overall */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">Overall Progress</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Overall Progress is based on Practice completion (60%) and Video watching (40%). 
                  It is not based on grades.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span>{hasContent ? `${totalProgress}%` : 'No content yet'}</span>
        </div>
        <Progress value={hasContent ? totalProgress : 0} className="h-2.5" />
      </div>

      {/* Breakdown Bars */}
      {showBreakdown && hasContent && (
        <div className="space-y-2 pl-1">
          {/* Practice Progress (60%) */}
          {hasPractice && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" />
                  <span>Practice</span>
                  <span className="text-muted-foreground/60 text-[10px]">(60%)</span>
                </div>
                <span className={cn(
                  "font-medium",
                  practiceProgress === 100 && "text-accent"
                )}>
                  {practiceProgress}%
                  <span className="text-muted-foreground/60 ml-1">
                    ({practiceCompleted}/{practiceTotal})
                  </span>
                </span>
              </div>
              <Progress value={practiceProgress} className="h-1.5" />
            </div>
          )}

          {/* Video Progress (40%) */}
          {hasVideos && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Video className="w-3 h-3" />
                  <span>Videos</span>
                  <span className="text-muted-foreground/60 text-[10px]">(40%)</span>
                </div>
                <span className={cn(
                  "font-medium",
                  videoProgress >= 100 && "text-accent"
                )}>
                  {videoProgress}%
                  <span className="text-muted-foreground/60 ml-1">
                    ({videosCompleted}/{videosTotal} watched)
                  </span>
                </span>
              </div>
              <Progress value={videoProgress} className="h-1.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
