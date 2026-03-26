import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface ChapterProgressPillProps {
  activeSection: string;
  totalProgress: number;
  practiceProgress: number;
  videoProgress: number;
  practiceCompleted: number;
  practiceTotal: number;
  videosCompleted: number;
  videosTotal: number;
  isLoading?: boolean;
}

function getProgressColor(percent: number) {
  if (percent >= 80) return 'hsl(var(--accent))';
  if (percent >= 40) return 'hsl(45 93% 47%)'; // amber
  return 'hsl(var(--muted-foreground))';
}

export function ChapterProgressPill({
  activeSection,
  totalProgress,
  practiceProgress,
  videoProgress,
  practiceCompleted,
  practiceTotal,
  videosCompleted,
  videosTotal,
  isLoading,
}: ChapterProgressPillProps) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
    );
  }

  // Determine what to display based on active section
  let percent: number;
  let label: string;

  if (activeSection === 'resources') {
    percent = videoProgress;
    label = videosTotal > 0 ? `${videosCompleted}/${videosTotal}` : '0%';
  } else if (activeSection === 'practice') {
    percent = practiceProgress;
    label = practiceTotal > 0 ? `${practiceCompleted}/${practiceTotal}` : '0%';
  } else {
    percent = totalProgress;
    label = `${totalProgress}%`;
  }

  const color = getProgressColor(percent);
  const ringSize = 22;
  const strokeAngle = (percent / 100) * 360;

  const hasContent = practiceTotal > 0 || videosTotal > 0;
  if (!hasContent) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default select-none">
            {/* Circular progress ring */}
            <div
              className="rounded-full flex-shrink-0"
              style={{
                width: ringSize,
                height: ringSize,
                background: `conic-gradient(${color} ${strokeAngle}deg, hsl(var(--muted)) ${strokeAngle}deg)`,
                padding: 3,
              }}
            >
              <div className="w-full h-full rounded-full bg-background" />
            </div>
            {/* Text label - hidden on mobile */}
            {!isMobile && (
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1 max-w-[200px]">
          <p className="font-semibold">Progress: {totalProgress}%</p>
          {practiceTotal > 0 && (
            <p>Practice (60%): {practiceCompleted}/{practiceTotal} — {practiceProgress}%</p>
          )}
          {videosTotal > 0 && (
            <p>Videos (40%): {videosCompleted}/{videosTotal} — {videoProgress}%</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
