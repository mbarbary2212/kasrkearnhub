import { Progress } from '@/components/ui/progress';

interface FlashcardProgressBarProps {
  current: number;
  total: number;
}

export function FlashcardProgressBar({ current, total }: FlashcardProgressBarProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full mt-4 space-y-1.5">
      <Progress value={percent} className="h-2" />
      <p className="text-center text-sm text-muted-foreground">
        Card {current} of {total}
      </p>
    </div>
  );
}
