import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRateMCQ } from '@/hooks/useMCQFSRS';
import { cn } from '@/lib/utils';

interface MCQFSRSRatingButtonsProps {
  mcqId: string;
  /** Called after a rating is successfully saved */
  onRated: (scheduledDays: number) => void;
}

const RATINGS = [
  {
    value: 'Again',
    label: 'Again',
    hint: '< 1 day',
    colour: 'border-rose-400 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  },
  {
    value: 'Hard',
    label: 'Hard',
    hint: 'few days',
    colour: 'border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30',
  },
  {
    value: 'Good',
    label: 'Good',
    hint: '~1 week',
    colour: 'border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
  {
    value: 'Easy',
    label: 'Easy',
    hint: '2+ weeks',
    colour: 'border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
];

export function MCQFSRSRatingButtons({ mcqId, onRated }: MCQFSRSRatingButtonsProps) {
  const rateMCQ = useRateMCQ();
  const [rated, setRated] = useState<string | null>(null);

  const handleRate = (rating: string) => {
    if (rateMCQ.isPending || rated) return;
    setRated(rating);
    rateMCQ.mutate(
      { mcqId, rating },
      {
        onSuccess: ({ scheduledDays }) => onRated(scheduledDays),
        onError: () => setRated(null),
      }
    );
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground text-center">How well did you know this?</p>
      <div className="flex gap-1.5 justify-center">
        {RATINGS.map((r) => (
          <Button
            key={r.value}
            variant="outline"
            size="sm"
            disabled={rateMCQ.isPending}
            onClick={() => handleRate(r.value)}
            className={cn(
              'flex flex-col h-auto py-1.5 px-3 gap-0 min-w-[56px]',
              rated === r.value ? 'opacity-50' : r.colour
            )}
          >
            <span className="text-xs font-medium">{r.label}</span>
            <span className="text-[10px] opacity-70">{r.hint}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
