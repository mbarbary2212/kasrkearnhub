import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiConfidenceBadgeProps {
  confidence: number | null | undefined;
  isAdmin: boolean;
}

/**
 * Displays an AI confidence score (0–10) badge, visible only to admins.
 */
export function AiConfidenceBadge({ confidence, isAdmin }: AiConfidenceBadgeProps) {
  if (!isAdmin || confidence === null || confidence === undefined) return null;

  const color = confidence >= 8
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200'
    : confidence >= 5
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';

  return (
    <Badge variant="outline" className={cn('text-[11px] gap-1 font-semibold', color)}>
      <Bot className="h-3 w-3" />
      AI: {confidence}/10
    </Badge>
  );
}
