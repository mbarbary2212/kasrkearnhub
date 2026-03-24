import { useMemo } from 'react';
import { Mcq, McqChoice, QuestionFormat } from '@/hooks/useMcqs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockExamQuestionProps {
  question: Mcq;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onSelectAnswer: (key: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function MockExamQuestion({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: MockExamQuestionProps) {
  const choices = question.choices || [];

  // Shuffle choices deterministically for students
  const shuffledChoices = useMemo(() => {
    const arr = [...choices];
    const seed = question.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [choices, question.id]);

  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        {question.question_format === 'sba' && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Select the BEST answer
          </span>
        )}
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium leading-relaxed">
            {question.stem}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shuffledChoices.map((choice: McqChoice) => (
            <Button
              key={choice.key}
              variant={selectedAnswer === choice.key ? "default" : "outline"}
              className={cn(
                "w-full justify-start text-left h-auto py-3 px-4",
                selectedAnswer === choice.key && "ring-2 ring-primary"
              )}
              onClick={() => onSelectAnswer(choice.key)}
            >
              <span className="font-semibold mr-3">{choice.key}.</span>
              <span className="flex-1 whitespace-normal">{choice.text}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
