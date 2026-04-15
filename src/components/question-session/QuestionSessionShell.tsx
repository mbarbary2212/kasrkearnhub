import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SkipForward, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RightInsightPanel } from './RightInsightPanel';
import { McqAnswerArea } from './McqAnswerArea';
import { MCQFSRSRatingButtons } from './MCQFSRSRatingButtons';
import { OsceAnswerArea } from './OsceAnswerArea';
import type { Mcq, McqChoice } from '@/hooks/useMcqs';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useSaveQuestionAttempt } from '@/hooks/useQuestionAttempts';
import type { Json } from '@/integrations/supabase/types';

type QuestionType = 'mcq' | 'sba' | 'osce';

export interface ActiveItemInfo {
  item_id: string;
  item_label: string;
  item_index: number;
}

interface QuestionSessionShellProps {
  questions: (Mcq | OsceQuestion)[];
  questionType: QuestionType;
  moduleId: string;
  chapterId?: string;
  attemptMap: Map<string, { is_correct: boolean | null; selected_answer?: Json }>;
  allAttempts: { question_id: string; question_type: string; is_correct: boolean | null }[];
  onActiveItemChange?: (info: ActiveItemInfo) => void;
}

function isMcq(q: Mcq | OsceQuestion): q is Mcq {
  return 'stem' in q && 'choices' in q;
}

export function QuestionSessionShell({
  questions,
  questionType,
  moduleId,
  chapterId,
  attemptMap,
  allAttempts,
  onActiveItemChange,
}: QuestionSessionShellProps) {
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const itemIndex = searchParams.get('item_index');
    if (itemIndex) {
      const idx = parseInt(itemIndex, 10);
      if (!isNaN(idx) && idx >= 0 && idx < questions.length) return idx;
    }
    return 0;
  });

  // Report active item whenever currentIndex changes
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q || !onActiveItemChange) return;
    const label = isMcq(q) ? `Question ${currentIndex + 1} of ${questions.length}` : `Question ${currentIndex + 1} of ${questions.length}`;
    onActiveItemChange({ item_id: q.id, item_label: label, item_index: currentIndex });
  }, [currentIndex, questions, onActiveItemChange]);
  const [sessionState, setSessionState] = useState<Map<string, {
    selectedAnswer: any;
    isSubmitted: boolean;
    isCorrect: boolean | null;
    score?: number;
    wasSkipped: boolean;
  }>>(new Map());

  const { markComplete } = useMarkItemComplete();
  const saveAttempt = useSaveQuestionAttempt();

  const currentQuestion = questions[currentIndex];

  const qState = sessionState.get(currentQuestion.id);
  const previousAttempt = attemptMap.get(currentQuestion.id);

  // Determine effective state: session state > previous attempt > default
  const isSubmitted = qState?.isSubmitted ?? !!previousAttempt;
  const isCorrect = qState?.isCorrect ?? previousAttempt?.is_correct ?? null;
  const wasSkipped = qState?.wasSkipped ?? false;

  const skippedQuestions = useMemo(() => {
    const set = new Set<string>();
    sessionState.forEach((state, id) => {
      if (state.wasSkipped && !state.isSubmitted) set.add(id);
    });
    return set;
  }, [sessionState]);

  const handleSubmitMcq = useCallback((selectedKey: string) => {
    if (!currentQuestion || !isMcq(currentQuestion)) return;
    const correct = selectedKey === currentQuestion.correct_key;

    setSessionState(prev => {
      const next = new Map(prev);
      next.set(currentQuestion.id, {
        selectedAnswer: selectedKey,
        isSubmitted: true,
        isCorrect: correct,
        wasSkipped: false,
      });
      return next;
    });

    if (chapterId) {
      markComplete(currentQuestion.id, 'mcq', chapterId);
      saveAttempt.mutate({
        questionId: currentQuestion.id,
        questionType: questionType === 'osce' ? 'osce' : 'mcq',
        chapterId,
        moduleId,
        selectedAnswer: selectedKey as unknown as Json,
        isCorrect: correct,
      });
    }
  }, [currentQuestion, chapterId, moduleId, questionType, markComplete, saveAttempt]);

  const handleSubmitOsce = useCallback((answers: Record<number, boolean | null>, score: number) => {
    if (!currentQuestion) return;
    const q = currentQuestion as OsceQuestion;
    const totalCorrect = score;
    const isCorrectResult = totalCorrect === 5;

    setSessionState(prev => {
      const next = new Map(prev);
      next.set(currentQuestion.id, {
        selectedAnswer: answers,
        isSubmitted: true,
        isCorrect: isCorrectResult,
        score: totalCorrect,
        wasSkipped: false,
      });
      return next;
    });

    if (chapterId) {
      markComplete(currentQuestion.id, 'osce', chapterId);
      saveAttempt.mutate({
        questionId: currentQuestion.id,
        questionType: 'osce',
        chapterId,
        moduleId,
        selectedAnswer: answers as unknown as Json,
        isCorrect: isCorrectResult,
        score: totalCorrect,
      });
    }
  }, [currentQuestion, chapterId, moduleId, markComplete, saveAttempt]);

  const handleSkip = useCallback(() => {
    setSessionState(prev => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion.id);
      if (!existing?.isSubmitted) {
        next.set(currentQuestion.id, {
          selectedAnswer: null,
          isSubmitted: false,
          isCorrect: null,
          wasSkipped: true,
        });
      }
      return next;
    });
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentQuestion, currentIndex, questions.length]);

  const handleRepeat = useCallback(() => {
    setSessionState(prev => {
      const next = new Map(prev);
      next.delete(currentQuestion.id);
      return next;
    });
  }, [currentQuestion]);

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Compute user chapter accuracy
  const chapterAccuracy = useMemo(() => {
    const mcqAttempts = allAttempts.filter(a =>
      a.question_type === (questionType === 'osce' ? 'osce' : 'mcq')
    );
    if (mcqAttempts.length === 0) return null;
    const correct = mcqAttempts.filter(a => a.is_correct).length;
    return { correct, total: mcqAttempts.length, percentage: Math.round((correct / mcqAttempts.length) * 100) };
  }, [allAttempts, questionType]);

  if (!currentQuestion) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] h-[calc(100vh-4rem)] gap-0 max-w-7xl mx-auto">
      {/* LEFT PANEL */}
      <div className="flex flex-col overflow-hidden border-r border-border">
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {/* Question header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-sm">
              Q{currentIndex + 1} / {questions.length}
            </Badge>
            {questionType === 'sba' && (
              <Badge variant="outline" className="text-xs font-semibold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                SBA
              </Badge>
            )}
            {wasSkipped && !isSubmitted && (
              <Badge variant="secondary" className="text-xs gap-1 bg-muted text-muted-foreground">
                <SkipForward className="h-3 w-3" />
                Skipped
              </Badge>
            )}
            {isSubmitted && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs gap-1",
                  isCorrect
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </Badge>
            )}
          </div>

          {/* Question content + answer area */}
          {questionType === 'osce' ? (
            <OsceAnswerArea
              question={currentQuestion as OsceQuestion}
              isSubmitted={isSubmitted}
              previousAnswers={
                qState?.selectedAnswer ??
                (previousAttempt?.selected_answer as Record<string, boolean> | undefined)
              }
              onSubmit={handleSubmitOsce}
            />
          ) : (
            <McqAnswerArea
              key={currentQuestion.id}
              question={currentQuestion as Mcq}
              isSubmitted={isSubmitted}
              previousSelectedKey={
                qState?.selectedAnswer ??
                (previousAttempt?.selected_answer as string | undefined)
              }
              questionType={questionType}
              onSubmit={handleSubmitMcq}
            />
          )}

          {/* Skip button (only pre-submission) */}
          {!isSubmitted && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="gap-1 text-muted-foreground"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </div>
          )}
        </div>

        {/* Navigation bar - pinned to bottom */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            {currentIndex + 1} of {questions.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={currentIndex === questions.length - 1}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <RightInsightPanel
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
        wasSkipped={wasSkipped}
        questionId={currentQuestion.id}
        questionType={questionType}
        question={currentQuestion}
        chapterId={chapterId}
        moduleId={moduleId}
        chapterAccuracy={chapterAccuracy}
        onRepeat={handleRepeat}
      />
    </div>
  );
}
