import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialReaction } from '@/hooks/useMaterialReaction';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FEEDBACK_OPTIONS = [
  'Incorrect content',
  'Unclear explanation',
  'Too easy',
  'Too difficult',
  'Poor wording',
  'Technical issue',
  'Other',
] as const;

interface MaterialReactionRowProps {
  materialType: string;
  materialId: string | undefined;
  chapterId?: string;
  className?: string;
}

export function MaterialReactionRow({ materialType, materialId, chapterId, className }: MaterialReactionRowProps) {
  const { currentReaction, react, isLoading } = useMaterialReaction(materialType, materialId, chapterId);
  const { user } = useAuth();
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  if (!materialId) return null;

  const handleFeedback = async (feedbackType: string) => {
    if (!user) return;
    // Save reaction as down
    react('down');
    // Save feedback
    const { error } = await supabase.from('material_feedback').insert({
      user_id: user.id,
      material_type: materialType,
      material_id: materialId,
      chapter_id: chapterId || null,
      feedback_type: feedbackType,
    });
    if (error) {
      console.error('Failed to save feedback:', error);
    } else {
      setSubmittedFeedback(true);
      toast.success('Feedback submitted');
      setTimeout(() => setSubmittedFeedback(false), 2000);
    }
  };

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isLoading}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
              'hover:bg-muted',
              currentReaction === 'down'
                ? 'text-destructive bg-destructive/10'
                : 'text-muted-foreground'
            )}
          >
            {submittedFeedback ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ThumbsDown className={cn('h-3.5 w-3.5', currentReaction === 'down' && 'fill-current')} />
            )}
            <span>{submittedFeedback ? 'Sent' : 'Not helpful'}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[180px]" onClick={(e) => e.stopPropagation()}>
          {FEEDBACK_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => handleFeedback(option)}
              className="text-xs cursor-pointer"
            >
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
