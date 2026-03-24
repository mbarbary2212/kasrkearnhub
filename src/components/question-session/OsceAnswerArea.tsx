import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';

interface OsceAnswerAreaProps {
  question: OsceQuestion;
  isSubmitted: boolean;
  previousAnswers?: Record<string, boolean> | null;
  onSubmit: (answers: Record<number, boolean | null>, score: number) => void;
}

export function OsceAnswerArea({
  question,
  isSubmitted,
  previousAnswers,
  onSubmit,
}: OsceAnswerAreaProps) {
  const initialAnswers = useMemo(() => {
    if (previousAnswers && typeof previousAnswers === 'object') {
      return {
        1: previousAnswers['1'] ?? null,
        2: previousAnswers['2'] ?? null,
        3: previousAnswers['3'] ?? null,
        4: previousAnswers['4'] ?? null,
        5: previousAnswers['5'] ?? null,
      };
    }
    return { 1: null, 2: null, 3: null, 4: null, 5: null };
  }, [previousAnswers]);

  const [answers, setAnswers] = useState<Record<number, boolean | null>>(initialAnswers);

  const statements = [
    { num: 1, text: question.statement_1, correct: question.answer_1, explanation: question.explanation_1 },
    { num: 2, text: question.statement_2, correct: question.answer_2, explanation: question.explanation_2 },
    { num: 3, text: question.statement_3, correct: question.answer_3, explanation: question.explanation_3 },
    { num: 4, text: question.statement_4, correct: question.answer_4, explanation: question.explanation_4 },
    { num: 5, text: question.statement_5, correct: question.answer_5, explanation: question.explanation_5 },
  ];

  const allAnswered = Object.values(answers).every(v => v !== null);

  const score = useMemo(() => {
    let s = 0;
    statements.forEach(st => {
      if (answers[st.num] === st.correct) s++;
    });
    return s;
  }, [answers, statements]);

  const handleToggle = (num: number, value: boolean) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [num]: value }));
  };

  const handleSubmit = () => {
    if (!allAnswered || isSubmitted) return;
    onSubmit(answers, score);
  };

  return (
    <div className="space-y-4">
      {/* History/Vignette */}
      <div className="space-y-2">
        {question.image_url && (
          <div className="rounded-lg overflow-hidden border border-border mb-3">
            <img
              src={question.image_url}
              alt="Clinical image"
              className="w-full max-h-48 object-contain bg-muted"
            />
          </div>
        )}
        <p className="text-base md:text-lg font-medium leading-relaxed text-foreground">
          {question.history_text}
        </p>
      </div>

      {/* Statements with T/F toggle */}
      <div className="space-y-2">
        {statements.map((st) => {
          const userAnswer = answers[st.num];
          const isCorrectAnswer = isSubmitted && userAnswer === st.correct;
          const isWrongAnswer = isSubmitted && userAnswer !== null && userAnswer !== st.correct;

          return (
            <div
              key={st.num}
              className={cn(
                'p-3 rounded-lg border-2 transition-all',
                isSubmitted && isCorrectAnswer && 'border-green-500/50 bg-green-500/5',
                isSubmitted && isWrongAnswer && 'border-red-500/50 bg-red-500/5',
                !isSubmitted && 'border-border',
              )}
            >
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="font-mono text-xs shrink-0 mt-0.5">
                  {st.num}
                </Badge>
                <p className="flex-1 text-sm leading-relaxed">{st.text}</p>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant={userAnswer === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggle(st.num, true)}
                    disabled={isSubmitted}
                    className={cn(
                      'h-7 px-2 text-xs',
                      isSubmitted && st.correct === true && 'bg-green-500 hover:bg-green-500 text-white',
                      isSubmitted && userAnswer === true && st.correct !== true && 'bg-red-500 hover:bg-red-500 text-white',
                    )}
                  >
                    T
                  </Button>
                  <Button
                    variant={userAnswer === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggle(st.num, false)}
                    disabled={isSubmitted}
                    className={cn(
                      'h-7 px-2 text-xs',
                      isSubmitted && st.correct === false && 'bg-green-500 hover:bg-green-500 text-white',
                      isSubmitted && userAnswer === false && st.correct !== false && 'bg-red-500 hover:bg-red-500 text-white',
                    )}
                  >
                    F
                  </Button>
                </div>
              </div>
              {/* Post-submission feedback */}
              {isSubmitted && (
                <div className="mt-2 ml-8 flex items-center gap-1.5 text-xs">
                  {isCorrectAnswer ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Correct
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <X className="h-3 w-3" /> Answer: {st.correct ? 'True' : 'False'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!isSubmitted && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="gap-2 min-w-[140px]"
          >
            <Check className="h-4 w-4" />
            Submit Answer
          </Button>
        </div>
      )}

      {/* Score summary */}
      {isSubmitted && (
        <div className={cn(
          'p-3 rounded-lg flex items-center gap-2 text-sm font-medium',
          score >= 4
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : score >= 3
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        )}>
          Score: {score} / 5
        </div>
      )}
    </div>
  );
}
