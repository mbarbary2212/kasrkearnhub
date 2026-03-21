import { useNavigate } from 'react-router-dom';
import { GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDueCardCount } from '@/hooks/useFSRS';

export function ScheduledReviewBanner() {
  const navigate = useNavigate();
  const { data: dueCount } = useDueCardCount();

  if (!dueCount || dueCount === 0) return null;

  return (
    <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GalleryHorizontal className="w-4 h-4 text-primary" />
          🔔 You have {dueCount} flashcard{dueCount > 1 ? 's' : ''} due for review today.
        </div>
        <Button size="sm" onClick={() => navigate('/review/flashcards')} className="gap-1">
          Start Revision →
        </Button>
      </div>
    </div>
  );
}
