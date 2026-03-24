import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Star, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mcq, McqChoice, QuestionFormat } from '@/hooks/useMcqs';
import { AiConfidenceBadge } from './AiConfidenceBadge';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useSaveQuestionAttempt } from '@/hooks/useQuestionAttempts';
import type { Json } from '@/integrations/supabase/types';

// Minimal attempt data needed for display
export interface McqAttemptData {
  selected_answer: Json;
  is_correct: boolean | null;
}

interface McqCardProps {
  mcq: Mcq;
  index: number;
  isAdmin: boolean;
  chapterId?: string;
  moduleId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isMarked?: boolean;
  onToggleMark?: (id: string) => void;
  isDeleted?: boolean;
  // Previous attempt data for restoring state
  previousAttempt?: McqAttemptData | null;
  questionFormat?: QuestionFormat;
}

export function McqCard({ 
  mcq, 
  index, 
  isAdmin, 
  chapterId,
  moduleId,
  onEdit, 
  onDelete, 
  onRestore,
  isMarked, 
  onToggleMark, 
  isDeleted = false,
  previousAttempt,
  questionFormat = 'mcq',
}: McqCardProps) {
  // Restore previous answer if available
  const initialSelectedKey = useMemo(() => {
    if (previousAttempt?.selected_answer) {
      return previousAttempt.selected_answer as string;
    }
    return null;
  }, [previousAttempt]);

  const [selectedKey, setSelectedKey] = useState<string | null>(initialSelectedKey);

  // Shuffle choices for students (deterministic based on question id)
  const shuffledChoices = useMemo(() => {
    if (isAdmin) return choices;
    const arr = [...choices];
    const seed = mcq.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [choices, mcq.id, isAdmin]);
  // If there was a previous attempt, start with answer revealed
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!previousAttempt);
  const hasMarkedComplete = useRef(false);
  const { markComplete } = useMarkItemComplete();
  const saveAttempt = useSaveQuestionAttempt();

  const choices = mcq.choices as McqChoice[];
  
  // Calculate correctness
  const isCorrect = selectedKey === mcq.correct_key;
  const showFeedback = isSubmitted && selectedKey !== null;

  // Mark as complete when submitted
  useEffect(() => {
    if (showFeedback && !hasMarkedComplete.current && !isAdmin && chapterId) {
      markComplete(mcq.id, 'mcq', chapterId);
      hasMarkedComplete.current = true;
    }
  }, [showFeedback, mcq.id, chapterId, isAdmin, markComplete]);

  const handleChoiceClick = (key: string) => {
    if (!isSubmitted) {
      setSelectedKey(key);
    }
  };

  const handleSubmit = () => {
    if (!selectedKey || isSubmitted) return;
    
    // Save attempt to database
    if (chapterId && moduleId && !isAdmin) {
      const correct = selectedKey === mcq.correct_key;
      saveAttempt.mutate({
        questionId: mcq.id,
        questionType: 'mcq',
        chapterId,
        moduleId,
        selectedAnswer: selectedKey as Json,
        isCorrect: correct,
      });
    }
    
    setIsSubmitted(true);
  };

  const handleRetry = () => {
    // Reset to allow new attempt
    setSelectedKey(null);
    setIsSubmitted(false);
    hasMarkedComplete.current = false;
  };

  const getChoiceStyle = (choice: McqChoice) => {
    if (!showFeedback) {
      return selectedKey === choice.key
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50 hover:bg-muted/50';
    }
    
    // When showing feedback after submit
    if (choice.key === mcq.correct_key) {
      // Correct answer - always green
      return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
    }
    if (selectedKey === choice.key && choice.key !== mcq.correct_key) {
      // User's wrong selection - red
      return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
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
              {/* SBA format badge */}
              {questionFormat === 'sba' && (
                <Badge 
                  variant="outline" 
                  className="text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                >
                  SBA
                </Badge>
              )}
              {/* Status indicator based on last attempt */}
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
              {/* Mark for Review star */}
              {onToggleMark && (
                <button
                  onClick={() => onToggleMark(mcq.id)}
                  className={cn(
                    'p-1 rounded-full transition-colors hover:bg-muted',
                    isMarked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                  )}
                  title={isMarked ? 'Remove from review' : 'Mark for review'}
                >
                  <Star className={cn('h-4 w-4', isMarked && 'fill-current')} />
                </button>
              )}
              {/* Difficulty badge - only visible to admins */}
              {isAdmin && mcq.difficulty && (
                <Badge 
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    mcq.difficulty === 'easy' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                    mcq.difficulty === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                    mcq.difficulty === 'hard' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  )}
                >
                  {mcq.difficulty}
                </Badge>
              )}
              {/* AI Confidence badge - only visible to admins */}
              <AiConfidenceBadge confidence={mcq.ai_confidence} isAdmin={isAdmin} />
            </div>
            <p className="text-base font-medium leading-relaxed">{mcq.stem}</p>
          </div>
          
          {/* Admin controls - visible Edit and Delete buttons, or Restore for deleted */}
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              {isDeleted && onRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRestore}
                  className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  title={questionFormat === 'sba' ? 'Restore SBA' : 'Restore MCQ'}
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
                      title={questionFormat === 'sba' ? 'Edit SBA' : 'Edit MCQ'}
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
                      title={questionFormat === 'sba' ? 'Delete SBA' : 'Delete MCQ'}
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
        {/* Choices */}
        <div className="space-y-2">
          {shuffledChoices.map((choice) => (
            <button
              key={choice.key}
              onClick={() => handleChoiceClick(choice.key)}
              disabled={isSubmitted}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                getChoiceStyle(choice),
                !isSubmitted && 'cursor-pointer'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full border-2 font-semibold text-sm shrink-0',
                showFeedback && choice.key === mcq.correct_key
                  ? 'border-green-500 bg-green-500 text-white'
                  : showFeedback && selectedKey === choice.key && choice.key !== mcq.correct_key
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-current'
              )}>
                {showFeedback && choice.key === mcq.correct_key ? (
                  <Check className="h-4 w-4" />
                ) : showFeedback && selectedKey === choice.key && choice.key !== mcq.correct_key ? (
                  <X className="h-4 w-4" />
                ) : (
                  choice.key
                )}
              </span>
              <span className="flex-1 pt-0.5">{choice.text}</span>
            </button>
          ))}
        </div>

        {/* Submit / Retry Button */}
        <div className="flex justify-center pt-2 gap-2">
          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={!selectedKey}
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
                  {questionFormat === 'sba' 
                    ? `Not the best answer. The best answer is ${mcq.correct_key}.`
                    : `Incorrect. The correct answer is ${mcq.correct_key}.`
                  }
                </span>
              </>
            )}
          </div>
        )}

        {/* Explanation - shown when answer is revealed */}
        {showFeedback && mcq.explanation && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{mcq.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
