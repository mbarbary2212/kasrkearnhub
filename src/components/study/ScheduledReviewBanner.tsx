import { useNavigate } from 'react-router-dom';
import { GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDueCardCount, useDueCards } from '@/hooks/useFSRS';

export function ScheduledReviewBanner() {
  const navigate = useNavigate();
  const { data: dueCount } = useDueCardCount();
  const { data: dueReviews } = useDueCards();

  if (!dueCount || dueCount === 0) return null;

  const handleStart = () => {
    if (!dueReviews?.length) {
      navigate('/review/flashcards');
      return;
    }

    const chapters = new Set(dueReviews.map(r => r.chapterId).filter(Boolean));
    if (chapters.size === 1) {
      const first = dueReviews[0];
      navigate(`/module/${first.moduleId}/chapter/${first.chapterId}?section=resources&tab=flashcards`);
    } else {
      navigate('/review/flashcards');
    }
  };

  return (
    <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GalleryHorizontal className="w-4 h-4 text-primary" />
          🔔 You have {dueCount} flashcard{dueCount > 1 ? 's' : ''} due for review today.
        </div>
        <Button size="sm" onClick={handleStart} className="gap-1">
          Start Revision →
        </Button>
      </div>
    </div>
  );
}
