import { Check, Flame, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardRating, useRateCard, CardRatingType } from '@/hooks/useCardRatings';
import { cn } from '@/lib/utils';

interface FlashcardRatingButtonsProps {
  cardId: string;
  visible: boolean;
  onRated?: () => void;
}

const RATINGS: { value: CardRatingType; label: string; icon: React.ReactNode; className: string; activeClassName: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    icon: <Check className="w-4 h-4" />,
    className: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
    activeClassName: 'bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-300',
  },
  {
    value: 'hard',
    label: 'Hard',
    icon: <Flame className="w-4 h-4" />,
    className: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30',
    activeClassName: 'bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-950/50 dark:border-amber-500 dark:text-amber-300',
  },
  {
    value: 'revise',
    label: 'Revise',
    icon: <RotateCcw className="w-4 h-4" />,
    className: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30',
    activeClassName: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-950/50 dark:border-red-500 dark:text-red-300',
  },
];

export function FlashcardRatingButtons({ cardId, visible, onRated }: FlashcardRatingButtonsProps) {
  const { data: currentRating } = useCardRating(cardId);
  const rateCard = useRateCard();

  if (!visible) return null;

  const handleRate = (rating: CardRatingType) => {
    rateCard.mutate({ cardId, rating }, {
      onSuccess: () => onRated?.(),
    });
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-3">
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
  );
}

export function RatingDot({ rating }: { rating?: CardRatingType | null }) {
  if (!rating) return null;
  const colors: Record<CardRatingType, string> = {
    easy: 'bg-emerald-500',
    hard: 'bg-amber-500',
    revise: 'bg-red-500',
  };
  return <span className={cn('inline-block w-2 h-2 rounded-full', colors[rating])} />;
}
