import { useEffect, useState } from 'react';
import { Mcq, McqChoice } from '@/hooks/useMcqs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HardModeQuestionProps {
  question: Mcq;
  questionIndex: number;
  totalQuestions: number;
  secondsPerQuestion: number;
  selectedAnswer: string | null;
  onSelectAnswer: (key: string) => void;
  onTimeUp: () => void;
  isPaused?: boolean;
}

export function HardModeQuestion({
  question,
  questionIndex,
  totalQuestions,
  secondsPerQuestion,
  selectedAnswer,
  onSelectAnswer,
  onTimeUp,
  isPaused = false,
}: HardModeQuestionProps) {
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const choices = question.choices || [];

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(secondsPerQuestion);
  }, [question.id, secondsPerQuestion]);

  // Countdown timer - stops if answer selected
  useEffect(() => {
    if (isPaused || selectedAnswer !== null) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question.id, isPaused, selectedAnswer, onTimeUp]);

  // Immediately advance when answer is selected
  useEffect(() => {
    if (selectedAnswer !== null) {
      onTimeUp();
    }
  }, [selectedAnswer, onTimeUp]);

  const progressPercent = (timeLeft / secondsPerQuestion) * 100;
  const isTimeLow = timeLeft <= 10;
  const isTimeCritical = timeLeft <= 5;

  return (
    <div className="space-y-4">
      {/* Timer and Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <div className={cn(
            "flex items-center gap-2 font-mono text-lg font-semibold",
            isTimeCritical && "text-red-600 animate-pulse",
            isTimeLow && !isTimeCritical && "text-amber-600"
          )}>
            <Clock className="w-5 h-5" />
            {timeLeft}s
          </div>
        </div>
        <Progress 
          value={progressPercent} 
          className={cn(
            "h-2 transition-all",
            isTimeCritical && "[&>div]:bg-red-500",
            isTimeLow && !isTimeCritical && "[&>div]:bg-amber-500"
          )} 
        />
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium leading-relaxed">
            {question.stem}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {choices.map((choice: McqChoice) => (
            <Button
              key={choice.key}
              variant={selectedAnswer === choice.key ? "default" : "outline"}
              className={cn(
                "w-full justify-start text-left h-auto py-3 px-4",
                selectedAnswer === choice.key && "ring-2 ring-primary"
              )}
              onClick={() => onSelectAnswer(choice.key)}
              disabled={selectedAnswer !== null}
            >
              <span className="font-semibold mr-3">{choice.key}.</span>
              <span className="flex-1 whitespace-normal">{choice.text}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* No navigation in hard mode - informational text */}
      <p className="text-center text-sm text-muted-foreground">
        Select an answer before time runs out
      </p>
    </div>
  );
}
