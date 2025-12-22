import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const hasContent = resourcesTotal > 0 || practiceTotal > 0;

  return (
    <div className="space-y-2">
      {/* Main Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Chapter Progress</span>
          <span>{hasContent ? `${totalProgress}% complete` : 'No content yet'}</span>
        </div>
        <Progress value={hasContent ? totalProgress : 0} className="h-2" />
      </div>

      {/* Optional Breakdown */}
      {showBreakdown && hasContent && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {resourcesTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3" />
              <span>Resources:</span>
              <span className={cn(
                "font-medium",
                resourcesProgress === 100 && "text-accent"
              )}>
                {resourcesProgress}%
              </span>
              <span className="text-muted-foreground/60">
                ({resourcesCompleted}/{resourcesTotal})
              </span>
            </div>
          )}
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
        </div>
      )}
    </div>
  );
}
