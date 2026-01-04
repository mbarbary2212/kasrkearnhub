import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OsceQuestion } from '@/hooks/useOsceQuestions';

interface OsceExamQuestionProps {
  question: OsceQuestion;
  questionIndex: number;
  totalQuestions: number;
  userAnswers: Record<number, boolean>;
  onSelectAnswer: (statementIndex: number, value: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export function OsceExamQuestion({
  question,
  questionIndex,
  totalQuestions,
  userAnswers,
  onSelectAnswer,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
}: OsceExamQuestionProps) {
  // Build statements array
  const statements = [
    { index: 1, text: question.statement_1 },
    { index: 2, text: question.statement_2 },
    { index: 3, text: question.statement_3 },
    { index: 4, text: question.statement_4 },
    { index: 5, text: question.statement_5 },
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Image and History - stacked layout */}
        <div className="p-4 border-b space-y-4">
          {/* Header with question number */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              Question {questionIndex + 1} of {totalQuestions}
            </Badge>
          </div>

          {/* Image container - large and centered */}
          <div className="w-full max-w-[500px] mx-auto">
            <div className="relative w-full max-h-[300px] md:max-h-[400px] lg:max-h-[450px] rounded-lg overflow-hidden bg-muted">
              {question.image_url ? (
                <img
                  src={question.image_url}
                  alt="Clinical image"
                  className="w-full h-full object-contain max-h-[300px] md:max-h-[400px] lg:max-h-[450px]"
                />
              ) : (
                <div className="flex items-center justify-center h-48 md:h-64">
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

        {/* Navigation */}
        <div className="p-4 border-t flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
