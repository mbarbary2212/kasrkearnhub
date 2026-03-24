import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mcq, McqChoice } from '@/hooks/useMcqs';

interface McqAnswerAreaProps {
  question: Mcq;
  isSubmitted: boolean;
  previousSelectedKey?: string | null;
  questionType: 'mcq' | 'sba';
  onSubmit: (selectedKey: string) => void;
}

export function McqAnswerArea({
  question,
  isSubmitted,
  previousSelectedKey,
  questionType,
  onSubmit,
}: McqAnswerAreaProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(previousSelectedKey ?? null);

  const choices = question.choices as McqChoice[];


  const getChoiceStyle = (choice: McqChoice) => {
    if (!isSubmitted) {
      return selectedKey === choice.key
        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
        : 'border-border hover:border-primary/50 hover:bg-muted/50';
    }

    // Post-submission feedback in left panel
    if (choice.key === question.correct_key) {
      return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
    }
    if (selectedKey === choice.key && choice.key !== question.correct_key) {
      return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
    }
    return 'border-border opacity-50';
  };

  const handleSubmit = () => {
    if (!selectedKey || isSubmitted) return;
    onSubmit(selectedKey);
  };

  return (
    <div className="space-y-4">
      {/* Question stem */}
      <div className="space-y-2">
        {questionType === 'sba' && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Select the BEST answer
          </p>
        )}
        <p className="text-base md:text-lg font-medium leading-relaxed text-foreground">
          {question.stem}
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {choices.map((choice) => (
          <button
            key={choice.key}
            onClick={() => !isSubmitted && setSelectedKey(choice.key)}
            disabled={isSubmitted}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
              getChoiceStyle(choice),
              !isSubmitted && 'cursor-pointer'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full border-2 font-semibold text-sm shrink-0',
              isSubmitted && choice.key === question.correct_key
                ? 'border-green-500 bg-green-500 text-white'
                : isSubmitted && selectedKey === choice.key && choice.key !== question.correct_key
                  ? 'border-red-500 bg-red-500 text-white'
                  : selectedKey === choice.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-current'
            )}>
              {isSubmitted && choice.key === question.correct_key ? (
                <Check className="h-4 w-4" />
              ) : isSubmitted && selectedKey === choice.key && choice.key !== question.correct_key ? (
                <span className="text-xs">✗</span>
              ) : (
                choice.key
              )}
            </span>
            <span className="flex-1 pt-0.5 text-sm md:text-base">{choice.text}</span>
          </button>
        ))}
      </div>

      {/* Submit button */}
      {!isSubmitted && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedKey}
            className="gap-2 min-w-[140px]"
          >
            <Check className="h-4 w-4" />
            Submit Answer
          </Button>
        </div>
      )}
    </div>
  );
}
