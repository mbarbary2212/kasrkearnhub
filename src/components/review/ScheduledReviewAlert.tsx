import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useDueCardCount, useDueCards } from '@/hooks/useFSRS';

export function ScheduledReviewAlert() {
  const navigate = useNavigate();
  const { data: dueCount } = useDueCardCount();
  const { data: dueReviews } = useDueCards();
  const [dismissed, setDismissed] = useState(false);

  const show = !dismissed && (dueCount ?? 0) > 0;

  const handleStart = () => {
    setDismissed(true);
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
    <AlertDialog open={show} onOpenChange={(open) => !open && setDismissed(true)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🔔 Flashcard Review Due</AlertDialogTitle>
          <AlertDialogDescription>
            You have {dueCount} card{(dueCount ?? 0) > 1 ? 's' : ''} due for review today.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={handleStart}>Start Revision →</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
