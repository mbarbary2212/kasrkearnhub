import type { ReactNode } from 'react';
import { Check, Flame, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardRating, useRateCard, useClearCardRating, CardRatingType } from '@/hooks/useCardRatings';
import { cn } from '@/lib/utils';

interface FlashcardRatingButtonsProps {
  cardId: string;
  visible: boolean;
  onRated?: () => void;
}

const RATINGS: { value: CardRatingType; label: string; icon: ReactNode; className: string; activeClassName: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    icon: <Check className="w-4 h-4" />,
    className: 'border-border text-foreground hover:bg-muted',
    activeClassName: 'bg-muted border-primary text-foreground',
  },
  {
    value: 'hard',
    label: 'Hard',
    icon: <Flame className="w-4 h-4" />,
    className: 'border-border text-foreground hover:bg-muted',
    activeClassName: 'bg-muted border-primary text-foreground',
  },
  {
    value: 'revise',
    label: 'Revise',
    icon: <RotateCcw className="w-4 h-4" />,
    className: 'border-border text-foreground hover:bg-muted',
    activeClassName: 'bg-muted border-primary text-foreground',
  },
];

export function FlashcardRatingButtons({ cardId, visible, onRated }: FlashcardRatingButtonsProps) {
  const { data: currentRating } = useCardRating(cardId);
  const rateCard = useRateCard();
  const clearCardRating = useClearCardRating();

  if (!visible) return null;

  const handleRate = (rating: CardRatingType) => {
    const isTogglingOff = currentRating?.rating === rating;

    if (isTogglingOff) {
      clearCardRating.mutate({ cardId });
      return;
    }

    rateCard.mutate(
      { cardId, rating },
      {
        onSuccess: () => onRated?.(),
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-3">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Rate:</span>
        {RATINGS.map((r) => {
          const isActive = currentRating?.rating === r.value;
          return (
            <Button
              key={r.value}
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRate(r.value);
              }}
              className={cn(
                'h-8 px-3 text-xs gap-1.5 transition-all',
                isActive ? r.activeClassName : r.className
              )}
            >
              {r.icon}
              {r.label}
            </Button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">Tap the selected rating again to clear it.</p>
    </div>
  );
}

export function RatingDot({ rating }: { rating?: CardRatingType | null }) {
  if (!rating) return null;

  const colors: Record<CardRatingType, string> = {
    easy: 'bg-primary',
    hard: 'bg-accent',
    revise: 'bg-destructive',
  };

  return <span className={cn('inline-block w-2 h-2 rounded-full', colors[rating])} />;
}
