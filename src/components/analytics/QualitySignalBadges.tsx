import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import type { QualitySignals } from '@/hooks/useContentQualitySignals';

interface QualitySignalBadgesProps {
  signals?: QualitySignals;
}

export function QualitySignalBadges({ signals }: QualitySignalBadgesProps) {
  if (!signals) return <span className="text-muted-foreground text-xs">—</span>;

  const { helpful_count, unhelpful_count, feedback_count } = signals;
  const hasSignals = helpful_count > 0 || unhelpful_count > 0 || feedback_count > 0;

  if (!hasSignals) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="flex items-center gap-2 text-xs">
      {helpful_count > 0 && (
        <span className="inline-flex items-center gap-0.5 text-green-600">
          <ThumbsUp className="h-3 w-3" />
          {helpful_count}
        </span>
      )}
      {unhelpful_count > 0 && (
        <span className="inline-flex items-center gap-0.5 text-red-500">
          <ThumbsDown className="h-3 w-3" />
          {unhelpful_count}
        </span>
      )}
      {feedback_count > 0 && (
        <span className="inline-flex items-center gap-0.5 text-orange-500">
          <MessageSquare className="h-3 w-3" />
          {feedback_count}
        </span>
      )}
    </div>
  );
}
