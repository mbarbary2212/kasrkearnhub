import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, GraduationCap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChapterProgressBarProps {
  totalProgress: number;
  resourcesProgress: number;
  practiceProgress: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  practiceCompleted: number;
  practiceTotal: number;
  isLoading?: boolean;
  showBreakdown?: boolean;
}

export function ChapterProgressBar({
  totalProgress,
  resourcesProgress,
  practiceProgress,
  resourcesCompleted,
  resourcesTotal,
  practiceCompleted,
  practiceTotal,
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

  // Progress is driven by practice items (coverage of completed interactions)
  const hasContent = practiceTotal > 0;

  return (
    <div className="space-y-2">
      {/* Main Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">Progress</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Progress reflects completed practice items, not exam scores.
                  Complete MCQs, OSCE, Essays, and other practice items to increase your progress.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span>{hasContent ? `${totalProgress}% complete` : 'No content yet'}</span>
        </div>
        <Progress value={hasContent ? totalProgress : 0} className="h-2" />
      </div>

      {/* Optional Breakdown - Resources shown as informational only */}
      {showBreakdown && hasContent && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {practiceTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" />
              <span>Practice:</span>
              <span className={cn(
                "font-medium",
                practiceProgress === 100 && "text-accent"
              )}>
                {practiceProgress}%
              </span>
              <span className="text-muted-foreground/60">
                ({practiceCompleted}/{practiceTotal})
              </span>
            </div>
          )}
          {resourcesTotal > 0 && (
            <div className="flex items-center gap-1.5 opacity-70">
              <FolderOpen className="w-3 h-3" />
              <span>Resources:</span>
              <span className="font-medium">
                {resourcesCompleted}/{resourcesTotal}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
