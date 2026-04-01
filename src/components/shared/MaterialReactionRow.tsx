import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialReaction } from '@/hooks/useMaterialReaction';

interface MaterialReactionRowProps {
  materialType: string;
  materialId: string | undefined;
  chapterId?: string;
  className?: string;
}

export function MaterialReactionRow({ materialType, materialId, chapterId, className }: MaterialReactionRowProps) {
  const { currentReaction, react, isLoading } = useMaterialReaction(materialType, materialId, chapterId);

  if (!materialId) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        disabled={isLoading}
        onClick={(e) => { e.stopPropagation(); react('up'); }}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
          'hover:bg-muted',
          currentReaction === 'up'
            ? 'text-green-600 dark:text-green-400 bg-green-500/10'
            : 'text-muted-foreground'
        )}
      >
        <ThumbsUp className={cn('h-3.5 w-3.5', currentReaction === 'up' && 'fill-current')} />
        <span>Helpful</span>
      </button>
      <button
        disabled={isLoading}
        onClick={(e) => { e.stopPropagation(); react('down'); }}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
          'hover:bg-muted',
          currentReaction === 'down'
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground'
        )}
      >
        <ThumbsDown className={cn('h-3.5 w-3.5', currentReaction === 'down' && 'fill-current')} />
        <span>Not helpful</span>
      </button>
    </div>
  );
}
