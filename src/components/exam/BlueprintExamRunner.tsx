import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Mcq } from '@/hooks/useMcqs';
import { PaperConfig } from './ExamPaperConfig';
import { ExamCoverPage } from './ExamCoverPage';
import { MockExamQuestion } from './MockExamQuestion';
import { EssayAnswerQuestion, EssayAnswer } from './EssayAnswerQuestion';
import { MockExamResults } from './MockExamResults';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, useCreateMockExamAttempt, useSubmitMockExam } from '@/hooks/useMockExam';
import { gradeWithRubric, gradeWithStructuredRubric } from '@/lib/rubricMarking';
import { parseRubric } from '@/types/essayRubric';
import { VPRubric } from '@/types/virtualPatient';
import { ModuleChapter } from '@/hooks/useChapters';
import { toast } from '@/hooks/use-toast';

interface Essay {
  id: string;
  title: string;
  question: string;
  keywords: string[] | null;
  chapter_id: string | null;
  rubric_json?: Record<string, unknown> | null;
  max_points?: number | null;
}

interface BlueprintExamRunnerProps {
  moduleId: string;
  moduleName: string;
  paper: PaperConfig;
  mcqs: Mcq[];
  essays: Essay[];
  chapters: ModuleChapter[];
  essaySettings: {
    handwriting_enabled: boolean;
    revision_enabled: boolean;
    max_revisions: number;
  };
  onBack: () => void;
}

type ExamPhase = 'cover' | 'in-progress' | 'completed';

interface ExamItem {
  type: 'mcq' | 'essay';
  id: string;
  data: Mcq | Essay;
}

const AUTOSAVE_INTERVAL_MS = 5000;

export function BlueprintExamRunner({
  moduleId,
  moduleName,
  paper,
  mcqs,
  essays,
  chapters,
  essaySettings,
  onBack,
}: BlueprintExamRunnerProps) {
  const { user } = useAuthContext();
  const createAttempt = useCreateMockExamAttempt();
  const submitExam = useSubmitMockExam();

  const [phase, setPhase] = useState<ExamPhase>('cover');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(paper.duration_minutes * 60);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // MCQ answers
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  // Essay answers
  const [essayAnswers, setEssayAnswers] = useState<Record<string, EssayAnswer>>({});

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);

  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build ordered exam items based on admin-configured question_order
  const examItems = useMemo<ExamItem[]>(() => {
    // Select MCQs based on chapter scope
    let filteredMcqs = mcqs;
    if (paper.chapter_ids.length > 0) {
      filteredMcqs = mcqs.filter(m => m.chapter_id && paper.chapter_ids.includes(m.chapter_id));
    }
    const shuffledMcqs = [...filteredMcqs].sort(() => Math.random() - 0.5);
    const selectedMcqs = shuffledMcqs.slice(0, paper.components.mcq_count);
    const mcqItems: ExamItem[] = selectedMcqs.map(m => ({ type: 'mcq', id: m.id, data: m }));

    // Select Essays based on chapter scope
    let filteredEssays = essays;
    if (paper.chapter_ids.length > 0) {
      filteredEssays = essays.filter(e => e.chapter_id && paper.chapter_ids.includes(e.chapter_id));
    }
    const shuffledEssays = [...filteredEssays].sort(() => Math.random() - 0.5);
    const selectedEssays = shuffledEssays.slice(0, paper.components.essay_count);
    const essayExamItems: ExamItem[] = selectedEssays.map(e => ({ type: 'essay', id: e.id, data: e }));

    const order = paper.question_order || 'essays_first';
    if (order === 'essays_first') {
      return [...essayExamItems, ...mcqItems];
    } else if (order === 'mcqs_first') {
      return [...mcqItems, ...essayExamItems];
    } else {
      // mixed: interleave
      const mixed: ExamItem[] = [];
      const a = essayExamItems;
      const b = mcqItems;
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < a.length) mixed.push(a[i]);
        if (i < b.length) mixed.push(b[i]);
      }
      return mixed;
    }
  }, [mcqs, essays, paper]);

  const mcqItems = examItems.filter(i => i.type === 'mcq');
  const essayItems = examItems.filter(i => i.type === 'essay');

  // Initialize essay answers
  useEffect(() => {
    const initial: Record<string, EssayAnswer> = {};
    essayItems.forEach(item => {
      if (!essayAnswers[item.id]) {
        initial[item.id] = {
          mode: 'typed',
          typed_text: '',
          handwriting_data: null,
          typed_summary: '',
          revision_count: 0,
          is_finalized: false,
        };
      }
    });
    if (Object.keys(initial).length > 0) {
      setEssayAnswers(prev => ({ ...initial, ...prev }));
    }
  }, [essayItems]);

  // === INTEGRITY CONTROLS ===

  // Block copy/paste/context menu on entire page
  useEffect(() => {
    if (phase !== 'in-progress') return;

    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockSelection = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('textarea') && !target.closest('input')) {
        e.preventDefault();
      }
    };
    const blockKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (!target.closest('textarea') && !target.closest('input')) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('paste', blockCopy);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('selectstart', blockSelection);
    document.addEventListener('keydown', blockKeyboard);

    return () => {
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('paste', blockCopy);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('selectstart', blockSelection);
      document.removeEventListener('keydown', blockKeyboard);
    };
  }, [phase]);

  // Tab switch warning
  useEffect(() => {
    if (phase !== 'in-progress') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        toast({
          title: '⚠️ Tab Switch Detected',
          description: 'Leaving this tab during an exam may be flagged.',
          variant: 'destructive',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase]);

  // Before unload warning
  useEffect(() => {
    if (phase !== 'in-progress') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // === TIMER ===
  useEffect(() => {
    if (phase !== 'in-progress') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        if (prev === 60) {
          setShowTimeWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // === AUTOSAVE ===
  const performAutosave = useCallback(async () => {
    if (!attemptId || !user?.id) return;

    const rows = examItems.map(item => {
      if (item.type === 'mcq') {
        return {
          attempt_id: attemptId,
          question_id: item.id,
          question_type: 'mcq',
          answer_mode: 'typed',
          selected_key: mcqAnswers[item.id] || null,
          last_autosave_at: new Date().toISOString(),
        };
      } else {
        const ea = essayAnswers[item.id];
        return {
          attempt_id: attemptId,
          question_id: item.id,
          question_type: 'essay',
          answer_mode: ea?.mode || 'typed',
          typed_text: ea?.typed_text || null,
          handwriting_data: ea?.handwriting_data || null,
          typed_summary: ea?.typed_summary || null,
          revision_count: ea?.revision_count || 0,
          is_finalized: ea?.is_finalized || false,
          finalized_at: ea?.is_finalized ? new Date().toISOString() : null,
          last_autosave_at: new Date().toISOString(),
        };
      }
    });

    const { error } = await supabase
      .from('exam_attempt_answers')
      .upsert(rows as any, { onConflict: 'attempt_id,question_id' });

    if (error) {
      console.error('Autosave failed:', error.message, error.details);
    }
  }, [attemptId, user?.id, examItems, mcqAnswers, essayAnswers]);

  useEffect(() => {
    if (phase !== 'in-progress') return;

    autosaveTimerRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [phase, performAutosave]);

  // === SCORE CALCULATION ===
  const calculateScoreAndMarkEssays = useCallback(async () => {
    let mcqScore = 0;
    mcqItems.forEach(item => {
      const mcq = item.data as Mcq;
      if (mcqAnswers[item.id] === mcq.correct_key) {
        mcqScore += paper.components.mcq_points;
      }
    });

    // Auto-mark essays using rubric engine
    let essayScore = 0;
    const essayMarkingRows: Array<{ question_id: string; score: number; max_score: number; marking_feedback: Record<string, unknown>; marked_at: string }> = [];

    for (const item of essayItems) {
      const essay = item.data as Essay;
      const answer = essayAnswers[item.id];
      const answerText = answer?.typed_text || answer?.typed_summary || '';
      const maxPoints = essay.max_points ?? paper.components.essay_points;

      // Prefer per-essay rubric_json, fall back to keywords
      const hasRubric = essay.rubric_json && typeof essay.rubric_json === 'object';
      const hasKeywords = essay.keywords && essay.keywords.length > 0;

      if ((hasRubric || hasKeywords) && answerText.trim()) {
        const rubric: VPRubric = hasRubric
          ? (essay.rubric_json as unknown as VPRubric)
          : {
              required_concepts: essay.keywords!,
              optional_concepts: [],
            };
        const result = gradeWithRubric(answerText, rubric);
        const points = Math.round(result.score * maxPoints);
        essayScore += points;

        essayMarkingRows.push({
          question_id: item.id,
          score: points,
          max_score: maxPoints,
          marking_feedback: {
            matched_required: result.matched_required,
            missing_required: result.missing_required,
            matched_optional: result.matched_optional,
            rubric_score: result.score,
          },
          marked_at: new Date().toISOString(),
        });
      } else {
        essayMarkingRows.push({
          question_id: item.id,
          score: 0,
          max_score: maxPoints,
          marking_feedback: { matched_required: [], missing_required: essay.keywords || [], matched_optional: [] },
          marked_at: new Date().toISOString(),
        });
      }
    }

    // Update essay answers with scores
    if (attemptId && essayMarkingRows.length > 0) {
      for (const row of essayMarkingRows) {
        const { error } = await supabase
          .from('exam_attempt_answers')
          .update({
            score: row.score,
            max_score: row.max_score,
            marking_feedback: row.marking_feedback as any,
            marked_at: row.marked_at,
          })
          .eq('attempt_id', attemptId)
          .eq('question_id', row.question_id);
        if (error) {
          console.error('Essay marking update failed:', row.question_id, error.message);
        }
      }
    }

    return mcqScore + essayScore;
  }, [mcqItems, essayItems, mcqAnswers, essayAnswers, paper.components, attemptId]);

  // === START EXAM ===
  const handleStart = async () => {
    try {
      const result = await createAttempt.mutateAsync({
        moduleId,
        questionIds: examItems.map(i => i.id),
        testMode: 'blueprint',
      });
      setAttemptId(result.id);
      setStartTime(new Date());
      setTimeRemaining(paper.duration_minutes * 60);
      setPhase('in-progress');
    } catch {
      // Error handled by mutation
    }
  };

  // === SUBMIT ===
  const handleSubmit = async () => {
    if (!attemptId || !startTime) return;

    // Final autosave with fallback
    await performAutosave();

    // Verify rows exist; if not, do a direct insert as fallback
    if (attemptId) {
      const { count } = await supabase
        .from('exam_attempt_answers')
        .select('id', { count: 'exact', head: true })
        .eq('attempt_id', attemptId);

      if (!count || count === 0) {
        console.warn('Autosave rows missing, attempting direct insert fallback');
        const fallbackRows = examItems.map(item => {
          if (item.type === 'mcq') {
            return {
              attempt_id: attemptId,
              question_id: item.id,
              question_type: 'mcq',
              answer_mode: 'typed',
              selected_key: mcqAnswers[item.id] || null,
            };
          } else {
            const ea = essayAnswers[item.id];
            return {
              attempt_id: attemptId,
              question_id: item.id,
              question_type: 'essay',
              answer_mode: ea?.mode || 'typed',
              typed_text: ea?.typed_text || null,
              handwriting_data: ea?.handwriting_data || null,
              typed_summary: ea?.typed_summary || null,
              revision_count: ea?.revision_count || 0,
              is_finalized: ea?.is_finalized || false,
            };
          }
        });
        const { error: insertError } = await supabase
          .from('exam_attempt_answers')
          .insert(fallbackRows as any);
        if (insertError) {
          console.error('Fallback insert also failed:', insertError.message, insertError.details);
        }
      }
    }

    const score = await calculateScoreAndMarkEssays();
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

    try {
      await submitExam.mutateAsync({
        attemptId,
        userAnswers: mcqAnswers,
        score,
        durationSeconds: duration,
        moduleId,
      });
      setFinalScore(score);
      setFinalDuration(duration);
      setPhase('completed');
    } catch {
      // Error handled by mutation
    }
  };

  const handleAutoSubmit = async () => {
    if (!attemptId || !startTime || phase !== 'in-progress') return;

    await performAutosave();

    const score = await calculateScoreAndMarkEssays();
    const duration = paper.duration_minutes * 60;

    try {
      await submitExam.mutateAsync({
        attemptId,
        userAnswers: mcqAnswers,
        score,
        durationSeconds: duration,
        moduleId,
      });
      setFinalScore(score);
      setFinalDuration(duration);
      setPhase('completed');
    } catch {
      // handled
    }
  };

  // === MCQ ANSWER ===
  const handleMcqAnswer = (key: string) => {
    const questionId = examItems[currentIndex]?.id;
    if (questionId) {
      setMcqAnswers(prev => ({ ...prev, [questionId]: key }));
    }
  };

  // === ESSAY ANSWER ===
  const handleEssayAnswer = (questionId: string, answer: EssayAnswer) => {
    setEssayAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // === NAVIGATION ===
  const currentItem = examItems[currentIndex];
  const answeredCount = useMemo(() => {
    let count = 0;
    examItems.forEach(item => {
      if (item.type === 'mcq' && mcqAnswers[item.id]) count++;
      if (item.type === 'essay' && essayAnswers[item.id]?.typed_text?.trim()) count++;
    });
    return count;
  }, [examItems, mcqAnswers, essayAnswers]);

  const progressPercent = (answeredCount / examItems.length) * 100;
  const isTimeLow = timeRemaining <= 60;
  const unansweredCount = examItems.length - answeredCount;

  const handleSubmitClick = () => {
    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      handleSubmit();
    }
  };

  // === COVER PAGE ===
  if (phase === 'cover') {
    return (
      <ExamCoverPage
        examName={paper.name}
        moduleName={moduleName}
        papers={[paper]}
        onStart={handleStart}
        isLoading={createAttempt.isPending}
      />
    );
  }

  // === COMPLETED ===
  if (phase === 'completed') {
    return (
      <MockExamResults
        moduleId={moduleId}
        moduleName={moduleName}
        questions={mcqItems.map(i => i.data as Mcq)}
        userAnswers={mcqAnswers}
        score={finalScore}
        totalQuestions={mcqItems.length}
        durationSeconds={finalDuration}
        chapters={chapters}
      />
    );
  }

  // === IN PROGRESS ===
  return (
    <div className="space-y-4" onContextMenu={(e) => e.preventDefault()}>
      {/* Timer and progress header */}
      <div className="sticky top-0 z-10 bg-background pb-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Button variant="destructive" size="sm" onClick={() => setShowAbortConfirm(true)}>
            Abort
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {answeredCount}/{examItems.length} answered
            </Badge>
            {mcqItems.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <FileText className="w-3 h-3" />
                {mcqItems.length} MCQ
              </Badge>
            )}
            {essayItems.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <FileText className="w-3 h-3" />
                {essayItems.length} Essay
              </Badge>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-2 font-mono text-lg font-semibold",
            isTimeLow && "text-destructive animate-pulse"
          )}>
            <Clock className="w-5 h-5" />
            {formatDuration(timeRemaining)}
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question navigator - separate rows per type */}
      <div className="space-y-3">
        {essayItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">Essays</p>
            <div className="flex flex-wrap gap-1">
              {essayItems.map((item, localIdx) => {
                const globalIdx = examItems.indexOf(item);
                const isAnswered = !!essayAnswers[item.id]?.typed_text?.trim();
                const isCurrent = globalIdx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(globalIdx)}
                    className={cn(
                      "w-8 h-8 text-xs font-medium rounded-md transition-all",
                      isCurrent && "ring-2 ring-amber-500 ring-offset-2",
                      isAnswered && "bg-amber-500 text-white",
                      !isAnswered && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    )}
                    title={`Essay ${localIdx + 1}`}
                  >
                    {localIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {mcqItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-primary mb-1.5">MCQs</p>
            <div className="flex flex-wrap gap-1">
              {mcqItems.map((item, localIdx) => {
                const globalIdx = examItems.indexOf(item);
                const isAnswered = !!mcqAnswers[item.id];
                const isCurrent = globalIdx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(globalIdx)}
                    className={cn(
                      "w-8 h-8 text-xs font-medium rounded-full transition-all",
                      isCurrent && "ring-2 ring-primary ring-offset-2",
                      isAnswered && "bg-primary text-primary-foreground",
                      !isAnswered && "bg-muted text-muted-foreground"
                    )}
                    title={`MCQ ${localIdx + 1}`}
                  >
                    {localIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Current question */}
      {currentItem?.type === 'mcq' && (
        <MockExamQuestion
          question={currentItem.data as Mcq}
          questionIndex={currentIndex}
          totalQuestions={examItems.length}
          selectedAnswer={mcqAnswers[currentItem.id] || null}
          onSelectAnswer={handleMcqAnswer}
          onPrevious={() => setCurrentIndex(i => Math.max(0, i - 1))}
          onNext={() => setCurrentIndex(i => Math.min(examItems.length - 1, i + 1))}
          canGoPrevious={currentIndex > 0}
          canGoNext={currentIndex < examItems.length - 1}
        />
      )}

      {currentItem?.type === 'essay' && (
        <EssayAnswerQuestion
          questionId={currentItem.id}
          questionText={(currentItem.data as Essay).question}
          questionIndex={essayItems.indexOf(currentItem)}
          totalQuestions={essayItems.length}
          maxPoints={paper.components.essay_points}
          answer={essayAnswers[currentItem.id] || {
            mode: 'typed',
            typed_text: '',
            handwriting_data: null,
            typed_summary: '',
            revision_count: 0,
            is_finalized: false,
          }}
          onAnswerChange={handleEssayAnswer}
          handwritingEnabled={essaySettings.handwriting_enabled}
          maxRevisions={essaySettings.revision_enabled ? essaySettings.max_revisions : 0}
        />
      )}

      {/* Navigation for essay items */}
      {currentItem?.type === 'essay' && (
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => Math.min(examItems.length - 1, i + 1))}
            disabled={currentIndex >= examItems.length - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleSubmitClick}
          className="w-full"
          size="lg"
          disabled={submitExam.isPending}
        >
          {submitExam.isPending ? 'Submitting...' : 'Submit Exam'}
        </Button>
      </div>

      {/* Submit confirmation */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit with unanswered questions?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
              Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time warning */}
      <AlertDialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              1 Minute Remaining!
            </AlertDialogTitle>
            <AlertDialogDescription>
              The exam will auto-submit when time runs out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Abort confirmation */}
      <AlertDialog open={showAbortConfirm} onOpenChange={setShowAbortConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Abort Exam?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setPhase('cover');
                setShowAbortConfirm(false);
                onBack();
              }}
            >
              Abort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
