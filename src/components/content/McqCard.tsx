import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Pencil, Trash2, Star, RotateCcw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mcq, McqChoice } from '@/hooks/useMcqs';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useSaveQuestionAttempt, QuestionAttempt } from '@/hooks/useQuestionAttempts';
import type { Json } from '@/integrations/supabase/types';

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
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  isDeleted?: boolean;
  // Previous attempt data for restoring state
  previousAttempt?: QuestionAttempt | null;
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
  isExpanded, 
  onToggleExpand,
  isDeleted = false,
  previousAttempt,
}: McqCardProps) {
  // Restore previous answer if available
  const initialSelectedKey = useMemo(() => {
    if (previousAttempt?.selected_answer) {
      return previousAttempt.selected_answer as string;
    }
    return null;
  }, [previousAttempt]);

  const [selectedKey, setSelectedKey] = useState<string | null>(initialSelectedKey);
  const hasMarkedComplete = useRef(false);
  const hasSavedAttempt = useRef(!!previousAttempt);
  const { markComplete } = useMarkItemComplete();
  const saveAttempt = useSaveQuestionAttempt();
  
  // Use controlled expand state if provided, otherwise internal state
  // If there's a previous attempt, auto-expand to show the answer
  const showAnswer = isExpanded ?? !!previousAttempt;

  const choices = mcq.choices as McqChoice[];

  // Mark as complete and save attempt when answer is shown
  useEffect(() => {
    if (showAnswer && selectedKey && !hasMarkedComplete.current && !isAdmin && chapterId) {
      markComplete(mcq.id, 'mcq', chapterId);
      hasMarkedComplete.current = true;
    }
  }, [showAnswer, selectedKey, mcq.id, chapterId, isAdmin, markComplete]);

  // Auto-save attempt when user selects and reveals answer
  useEffect(() => {
    if (showAnswer && selectedKey && !hasSavedAttempt.current && !isAdmin && chapterId && moduleId) {
      const isCorrect = selectedKey === mcq.correct_key;
      saveAttempt.mutate({
        questionId: mcq.id,
        questionType: 'mcq',
        chapterId,
        moduleId,
        selectedAnswer: selectedKey as Json,
        isCorrect,
      });
      hasSavedAttempt.current = true;
    }
  }, [showAnswer, selectedKey, mcq.id, mcq.correct_key, chapterId, moduleId, isAdmin, saveAttempt]);

  const handleChoiceClick = (key: string) => {
    if (!showAnswer) {
      setSelectedKey(key);
    }
  };

  const getChoiceStyle = (choice: McqChoice) => {
    if (!showAnswer) {
      return selectedKey === choice.key
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50 hover:bg-muted/50';
    }
    
    // When showing answer
    if (choice.key === mcq.correct_key) {
      return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
    }
    if (selectedKey === choice.key && choice.key !== mcq.correct_key) {
      return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
    }
    return 'border-border opacity-60';
  };

  // Check if this question was previously answered
  const wasAttempted = !!previousAttempt;
  const wasCorrect = previousAttempt?.is_correct;

  return (
    <Card className={cn(
      "overflow-hidden",
      wasAttempted && "ring-1 ring-offset-1",
      wasAttempted && wasCorrect && "ring-green-300 dark:ring-green-700",
      wasAttempted && !wasCorrect && "ring-amber-300 dark:ring-amber-700"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">
                Q{index + 1}
              </Badge>
              {/* Previously answered indicator */}
              {wasAttempted && !isAdmin && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    wasCorrect 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  {wasCorrect ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Correct</>
                  ) : (
                    'Attempted'
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
                  title="Restore MCQ"
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
                      title="Edit MCQ"
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
                      title="Delete MCQ"
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
          {choices.map((choice) => (
            <button
              key={choice.key}
              onClick={() => handleChoiceClick(choice.key)}
              disabled={showAnswer}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                getChoiceStyle(choice),
                !showAnswer && 'cursor-pointer'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full border-2 font-semibold text-sm shrink-0',
                showAnswer && choice.key === mcq.correct_key
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-current'
              )}>
                {choice.key}
              </span>
              <span className="flex-1 pt-0.5">{choice.text}</span>
            </button>
          ))}
        </div>

        {/* Show/Hide Answer Button */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onToggleExpand) {
                onToggleExpand(mcq.id);
              }
              // Reset selection when collapsing
              if (showAnswer && !wasAttempted) {
                setSelectedKey(null);
              }
            }}
            className="gap-2"
          >
            {showAnswer ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Answer
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Answer
              </>
            )}
          </Button>
        </div>

        {/* Explanation - shown when answer is revealed */}
        {showAnswer && mcq.explanation && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{mcq.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}