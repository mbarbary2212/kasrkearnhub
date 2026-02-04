import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrueFalseQuestion } from '@/hooks/useTrueFalseQuestions';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useSaveQuestionAttempt } from '@/hooks/useQuestionAttempts';
import type { Json } from '@/integrations/supabase/types';

// Minimal attempt data needed for display
export interface TrueFalseAttemptData {
  selected_answer: Json;
  is_correct: boolean | null;
}

interface TrueFalseCardProps {
  question: TrueFalseQuestion;
  index: number;
  isAdmin: boolean;
  chapterId?: string;
  moduleId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isDeleted?: boolean;
  previousAttempt?: TrueFalseAttemptData | null;
}

export function TrueFalseCard({ 
  question, 
  index, 
  isAdmin, 
  chapterId,
  moduleId,
  onEdit, 
  onDelete, 
  onRestore,
  isDeleted = false,
  previousAttempt,
}: TrueFalseCardProps) {
  // Restore previous answer if available
  const initialSelectedAnswer = useMemo(() => {
    if (previousAttempt?.selected_answer !== undefined && previousAttempt?.selected_answer !== null) {
      return previousAttempt.selected_answer as boolean;
    }
    return null;
  }, [previousAttempt]);

  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(initialSelectedAnswer);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!previousAttempt);
  const hasMarkedComplete = useRef(false);
  const { markComplete } = useMarkItemComplete();
  const saveAttempt = useSaveQuestionAttempt();

  // Calculate correctness
  const isCorrect = selectedAnswer === question.correct_answer;
  const showFeedback = isSubmitted && selectedAnswer !== null;

  // Mark as complete when submitted (use 'mcq' type for DB compatibility)
  useEffect(() => {
    if (showFeedback && !hasMarkedComplete.current && !isAdmin && chapterId) {
      markComplete(question.id, 'mcq', chapterId);
      hasMarkedComplete.current = true;
    }
  }, [showFeedback, question.id, chapterId, isAdmin, markComplete]);

  const handleAnswerClick = (answer: boolean) => {
    if (!isSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer === null || isSubmitted) return;
    
    // Save attempt to database (use 'mcq' type for DB compatibility)
    if (chapterId && moduleId && !isAdmin) {
      const correct = selectedAnswer === question.correct_answer;
      saveAttempt.mutate({
        questionId: question.id,
        questionType: 'mcq',
        chapterId,
        moduleId,
        selectedAnswer: selectedAnswer as unknown as Json,
        isCorrect: correct,
      });
    }
    
    setIsSubmitted(true);
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    hasMarkedComplete.current = false;
  };

  const getButtonStyle = (answer: boolean) => {
    if (!showFeedback) {
      return selectedAnswer === answer
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border hover:border-primary/50 hover:bg-muted/50';
    }
    
    // When showing feedback
    if (answer === question.correct_answer) {
      return 'border-green-500 bg-green-500 text-white';
    }
    if (selectedAnswer === answer && answer !== question.correct_answer) {
      return 'border-red-500 bg-red-500 text-white';
    }
    return 'border-border opacity-60';
  };

  // Status label for this question
  const statusLabel = useMemo(() => {
    if (!previousAttempt) return null;
    return previousAttempt.is_correct ? 'Correct' : 'Attempted';
  }, [previousAttempt]);

  return (
    <Card className={cn(
      "overflow-hidden",
      previousAttempt && "ring-1 ring-offset-1",
      previousAttempt?.is_correct && "ring-green-300 dark:ring-green-700",
      previousAttempt && !previousAttempt.is_correct && "ring-amber-300 dark:ring-amber-700"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">
                Q{index + 1}
              </Badge>
              {statusLabel && !isAdmin && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs gap-1",
                    statusLabel === 'Correct' 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  {statusLabel === 'Correct' ? (
                    <><Check className="h-3 w-3" /> Correct</>
                  ) : (
                    <><X className="h-3 w-3" /> Attempted</>
                  )}
                </Badge>
              )}
              {isAdmin && question.difficulty && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    question.difficulty === 'easy' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                    question.difficulty === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                    question.difficulty === 'hard' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  )}
                >
                  {question.difficulty}
                </Badge>
              )}
            </div>
            <p className="text-base font-medium leading-relaxed">{question.statement}</p>
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              {isDeleted && onRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRestore}
                  className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  title="Restore Question"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
              ) : (
                <>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEdit}
                      className="h-8 w-8 p-0"
                      title="Edit Question"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDelete}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* True/False Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleAnswerClick(true)}
            disabled={isSubmitted}
            className={cn(
              'flex-1 max-w-[160px] py-4 px-6 rounded-xl border-2 font-bold text-lg transition-all',
              getButtonStyle(true),
              !isSubmitted && 'cursor-pointer hover:scale-[1.02]'
            )}
          >
            TRUE
          </button>
          <button
            onClick={() => handleAnswerClick(false)}
            disabled={isSubmitted}
            className={cn(
              'flex-1 max-w-[160px] py-4 px-6 rounded-xl border-2 font-bold text-lg transition-all',
              getButtonStyle(false),
              !isSubmitted && 'cursor-pointer hover:scale-[1.02]'
            )}
          >
            FALSE
          </button>
        </div>

        {/* Submit / Retry Button */}
        <div className="flex justify-center pt-2 gap-2">
          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Submit Answer
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>

        {/* Feedback message after submit */}
        {showFeedback && (
          <div className={cn(
            "p-3 rounded-lg flex items-center gap-2",
            isCorrect 
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          )}>
            {isCorrect ? (
              <>
                <Check className="h-5 w-5 shrink-0" />
                <span className="font-medium">Correct!</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 shrink-0" />
                <span className="font-medium">
                  Incorrect. The correct answer is {question.correct_answer ? 'TRUE' : 'FALSE'}.
                </span>
              </>
            )}
          </div>
        )}

        {/* Explanation */}
        {showFeedback && question.explanation && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
