import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { scheduler, rowToCard } from '@/lib/fsrs';
import { Rating, createEmptyCard } from 'ts-fsrs';
import { useRateCard } from '@/hooks/useFSRS';

interface FSRSRatingButtonsProps {
  cardId: string | undefined;
  fsrsState: any | null;
  visible: boolean;
  onRated: (rating: string) => void;
}

const RATINGS = [
  { key: 'Again', grade: Rating.Again, emoji: '🔴', color: 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30', tooltip: '' },
  { key: 'Hard', grade: Rating.Hard, emoji: '🟠', color: 'border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30', tooltip: 'Use only when you DID remember but it was difficult. If you forgot, press Again.' },
  { key: 'Good', grade: Rating.Good, emoji: '🟢', color: 'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30', tooltip: '' },
  { key: 'Easy', grade: Rating.Easy, emoji: '⭐', color: 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30', tooltip: '' },
] as const;

function formatInterval(days: number): string {
  if (days < 1) {
    const minutes = Math.max(1, Math.round(days * 24 * 60));
    return `${minutes} min`;
  }
  const rounded = Math.round(days);
  return rounded === 1 ? '1 day' : `${rounded} days`;
}

export default function FSRSRatingButtons({ cardId, fsrsState, visible, onRated }: FSRSRatingButtonsProps) {
  const rateCard = useRateCard();

  const intervals = useMemo(() => {
    try {
      const card = fsrsState ? rowToCard(fsrsState) : createEmptyCard();
      const now = new Date();
      return RATINGS.map(r => ({
        ...r,
        interval: formatInterval(scheduler.next(card, now, r.grade).card.scheduled_days),
      }));
    } catch (e) {
      console.error('[FSRSRatingButtons] interval calc error:', e);
      return null;
    }
  }, [fsrsState]);

  if (!visible || !intervals || !cardId) return null;

  const handleRate = (rating: string) => {
    if (rateCard.isPending) return;
    rateCard.mutate(
      { cardId, rating },
      { onSuccess: () => onRated(rating) }
    );
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {intervals.map(r => {
          const btn = (
            <Button
              key={r.key}
              variant="outline"
              className={`flex flex-col items-center gap-0.5 h-auto py-2 px-1 ${r.color}`}
              disabled={rateCard.isPending}
              onClick={() => handleRate(r.key)}
            >
              <span className="text-sm font-medium">{r.emoji} {r.key}</span>
              <span className="text-[10px] opacity-70">{r.interval}</span>
            </Button>
          );

          if (r.tooltip) {
            return (
              <Tooltip key={r.key}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-center text-xs">
                  {r.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          }

          return btn;
        })}
      </div>
    </TooltipProvider>
  );
}
