import { useNavigate } from 'react-router-dom';
import { GalleryHorizontal, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDueCardCount } from '@/hooks/useFSRS';
import { useDueMCQCount } from '@/hooks/useMCQFSRS';

export function ScheduledReviewBanner() {
  const navigate = useNavigate();
  const { data: dueCards = 0 } = useDueCardCount();
  const { data: dueMCQs = 0 } = useDueMCQCount();

  const total = dueCards + dueMCQs;
  if (total === 0) return null;

  const handleStart = () => {
    if (dueCards > 0) {
      navigate('/review/flashcards');
    } else {
      navigate('/progress?tab=plan');
    }
  };

  return (
    <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">🔔 Reviews due today</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dueCards > 0 && (
              <span className="flex items-center gap-1">
                <GalleryHorizontal className="w-3.5 h-3.5" />
                {dueCards} flashcard{dueCards !== 1 ? 's' : ''}
              </span>
            )}
            {dueMCQs > 0 && (
              <span className="flex items-center gap-1">
                <FileQuestion className="w-3.5 h-3.5" />
                {dueMCQs} MCQ{dueMCQs !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={handleStart} className="gap-1">
          Start Review →
        </Button>
      </div>
    </div>
  );
}
