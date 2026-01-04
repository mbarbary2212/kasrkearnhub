import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OsceQuestion } from '@/hooks/useOsceQuestions';

interface HardModeOsceQuestionProps {
  question: OsceQuestion;
  questionIndex: number;
  totalQuestions: number;
  secondsPerQuestion: number;
  userAnswers: Record<number, boolean>;
  onSelectAnswer: (statementIndex: number, value: boolean) => void;
  onTimeUp: () => void;
}

export function HardModeOsceQuestion({
  question,
  questionIndex,
  totalQuestions,
  secondsPerQuestion,
  userAnswers,
  onSelectAnswer,
  onTimeUp,
}: HardModeOsceQuestionProps) {
  const [timeRemaining, setTimeRemaining] = useState(secondsPerQuestion);
  const [isTimeCritical, setIsTimeCritical] = useState(false);

  // Build statements array
  const statements = [
    { index: 1, text: question.statement_1 },
    { index: 2, text: question.statement_2 },
    { index: 3, text: question.statement_3 },
    { index: 4, text: question.statement_4 },
    { index: 5, text: question.statement_5 },
  ];

  // Count answered statements
  const answeredCount = Object.keys(userAnswers).length;

  // Reset timer when question changes
  useEffect(() => {
    setTimeRemaining(secondsPerQuestion);
    setIsTimeCritical(false);
  }, [question.id, secondsPerQuestion]);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        if (prev <= 10) {
          setIsTimeCritical(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question.id, onTimeUp]);

  const progressPercent = (timeRemaining / secondsPerQuestion) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isTimeCritical && "ring-2 ring-destructive animate-pulse"
    )}>
      <CardContent className="p-0">
        {/* Timer header */}
        <div className={cn(
          "p-4 border-b",
          isTimeCritical ? "bg-destructive/10" : "bg-muted/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">
              Question {questionIndex + 1} of {totalQuestions}
            </Badge>
            <Badge variant={isTimeCritical ? "destructive" : "secondary"} className="gap-1 text-lg font-mono">
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </Badge>
          </div>
          <Progress 
            value={progressPercent} 
            className={cn("h-2", isTimeCritical && "[&>div]:bg-destructive")}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {answeredCount}/5 statements answered
          </p>
        </div>

        {/* Image and History - stacked layout */}
        <div className="p-4 border-b space-y-4">
          {/* Image container - large and centered */}
          <div className="w-full max-w-[500px] mx-auto">
            <div className="relative w-full max-h-[250px] md:max-h-[350px] rounded-lg overflow-hidden bg-muted">
              {question.image_url ? (
                <img
                  src={question.image_url}
                  alt="Clinical image"
                  className="w-full h-full object-contain max-h-[250px] md:max-h-[350px]"
                />
              ) : (
                <div className="flex items-center justify-center h-40 md:h-56">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Clinical History - below image */}
          <div>
            <h3 className="font-medium text-lg mb-2">Clinical History</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{question.history_text}</p>
          </div>
        </div>

        {/* Statements */}
        <div className="p-4 space-y-3">
          <p className="font-medium text-sm text-muted-foreground mb-4">
            For each statement, indicate whether it is True or False:
          </p>

          {statements.map((statement) => {
            const hasAnswered = userAnswers[statement.index] !== undefined;
            const currentValue = userAnswers[statement.index];

            return (
              <div
                key={statement.index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  hasAnswered ? "border-primary/30 bg-primary/5" : "border-muted"
                )}
              >
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium mr-2">{statement.index}.</span>
                    {statement.text}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => onSelectAnswer(statement.index, true)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      currentValue === true
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    True
                  </button>
                  <button
                    onClick={() => onSelectAnswer(statement.index, false)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      currentValue === false
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    False
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
