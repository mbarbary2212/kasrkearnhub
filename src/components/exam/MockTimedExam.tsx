import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Mcq } from '@/hooks/useMcqs';
import { 
  MockExamSettings, 
  useCreateMockExamAttempt, 
  useSubmitMockExam,
  formatDuration,
} from '@/hooks/useMockExam';
import { TestModeSelector, TestMode } from './TestModeSelector';
import { MockExamQuestion } from './MockExamQuestion';
import { HardModeQuestion } from './HardModeQuestion';
import { TransitionScreen } from './TransitionScreen';
import { MockExamResults } from './MockExamResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { 
  Clock, 
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleChapter } from '@/hooks/useChapters';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { fetchSeenQuestionIds, selectWithUnseenPreference } from '@/lib/examQuestionSelector';

interface MockTimedExamProps {
  moduleId: string;
  moduleName?: string;
  mcqs?: Mcq[];
  settings?: MockExamSettings;
  chapters?: ModuleChapter[];
  onBack?: () => void;
  // Chapter-level exam props
  chapterId?: string;
  chapterMcqs?: Mcq[];
  onComplete?: () => void;
  questionCount?: number;
  secondsPerQuestion?: number;
}

type ExamPhase = 'select-mode' | 'in-progress' | 'transition' | 'completed';

// Transition delay between questions in hard mode (seconds)
const HARD_MODE_TRANSITION_SECONDS = 3;

export function MockTimedExam({
  moduleId,
  moduleName = 'Test',
  mcqs,
  settings,
  chapters = [],
  onBack,
  chapterId,
  chapterMcqs,
  onComplete,
  secondsPerQuestion: propSecondsPerQuestion,
}: MockTimedExamProps) {
  const { user } = useAuthContext();
  const createAttempt = useCreateMockExamAttempt();
  const submitExam = useSubmitMockExam();

  const [phase, setPhase] = useState<ExamPhase>('select-mode');
  const [testMode, setTestMode] = useState<TestMode>('easy');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<Mcq[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);

  // Use chapter MCQs if provided, otherwise use module MCQs
  const examMcqs = chapterMcqs || mcqs || [];
  const isChapterMode = !!chapterMcqs;
  
  // Calculate exam parameters
  const effectiveSecondsPerQuestion = propSecondsPerQuestion ?? settings?.seconds_per_question ?? 60;

  // Save individual question attempts to question_attempts table for analytics
  const saveQuestionAttempts = useCallback(async (
    questions: Mcq[],
    answers: Record<string, string>
  ) => {
    if (!user?.id) return;

    const attemptsToInsert = questions.map(q => {
      const selectedAnswer = answers[q.id] || null;
      const isCorrect = selectedAnswer === q.correct_key;
      return {
        user_id: user.id,
        question_id: q.id,
        question_type: 'mcq' as const,
        chapter_id: q.chapter_id,
        module_id: moduleId,
        attempt_number: 1, // Timed exams are standalone attempts
        selected_answer: selectedAnswer,
        status: selectedAnswer ? (isCorrect ? 'correct' : 'incorrect') : 'attempted',
        is_correct: selectedAnswer ? isCorrect : null,
        score: isCorrect ? 1 : 0,
      };
    });

    try {
      await supabase
        .from('question_attempts')
        .insert(attemptsToInsert as never);
    } catch (error) {
      console.error('Error saving question attempts:', error);
    }
  }, [user?.id, moduleId]);

  // Handler for going back - supports both modes
  const handleGoBack = () => {
    if (onComplete) {
      onComplete();
    } else if (onBack) {
      onBack();
    }
  };

  // Seen-question cache: fetched once when exam pool is ready
  const seenMapRef = useRef<Map<string, import('@/lib/examQuestionSelector').SeenQuestionInfo> | null>(null);
  const seenFetchedRef = useRef(false);

  // Pre-fetch seen questions when the component mounts with a valid pool
  useEffect(() => {
    if (!user?.id || examMcqs.length === 0 || seenFetchedRef.current) return;
    seenFetchedRef.current = true;
    fetchSeenQuestionIds(user.id, moduleId).then(map => {
      seenMapRef.current = map;
    });
  }, [user?.id, moduleId, examMcqs.length]);

  // Select questions with unseen preference
  const selectQuestionsUnseen = useCallback((count: number) => {
    const seenMap = seenMapRef.current ?? new Map();
    return selectWithUnseenPreference(examMcqs, count, seenMap);
  }, [examMcqs]);

  // Start the exam with selected mode and question count
  const handleStartExam = async (mode: TestMode, questionCount: number) => {
    // Ensure seen data is loaded; if not, fetch synchronously
    if (!seenMapRef.current && user?.id) {
      seenMapRef.current = await fetchSeenQuestionIds(user.id, moduleId);
    }

    const selected = selectQuestionsUnseen(questionCount);
    setExamQuestions(selected);
    setTestMode(mode);
    setTimeRemaining(questionCount * effectiveSecondsPerQuestion);
    setStartTime(new Date());
    setUserAnswers({});
    setCurrentIndex(0);

    try {
      const result = await createAttempt.mutateAsync({
        moduleId,
        questionIds: selected.map(q => q.id),
        testMode: mode,
      });
      setAttemptId(result.id);
      setPhase('in-progress');
    } catch {
      // Error handled by mutation
    }
  };

  // Timer effect for EASY MODE only (global timer)
  useEffect(() => {
    if (phase !== 'in-progress' || testMode !== 'easy') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleAutoSubmit();
          return 0;
        }
        // Show warning at 1 minute
        if (prev === 60) {
          setShowTimeWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, testMode]);

  // Calculate score
  const calculateScore = useCallback(() => {
    let correct = 0;
    examQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correct_key) {
        correct++;
      }
    });
    return correct;
  }, [examQuestions, userAnswers]);

  // Submit exam
  const handleSubmit = async () => {
    if (!attemptId || !startTime) return;

    const score = calculateScore();
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      // Save individual question attempts for analytics
      await saveQuestionAttempts(examQuestions, userAnswers);
      
      await submitExam.mutateAsync({
        attemptId,
        userAnswers,
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

  // Auto-submit when time runs out (Easy Mode) or last question done (Hard Mode)
  const handleAutoSubmit = async () => {
    if (!attemptId || !startTime || (phase !== 'in-progress' && phase !== 'transition')) return;

    const score = calculateScore();
    const duration = testMode === 'easy' 
      ? examQuestions.length * effectiveSecondsPerQuestion // Full time used for easy mode
      : Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      // Save individual question attempts for analytics
      await saveQuestionAttempts(examQuestions, userAnswers);
      
      await submitExam.mutateAsync({
        attemptId,
        userAnswers,
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

  // Handle answer selection - EASY MODE (manual navigation)
  const handleSelectAnswerEasy = (key: string) => {
    const questionId = examQuestions[currentIndex]?.id;
    if (questionId) {
      setUserAnswers(prev => ({ ...prev, [questionId]: key }));
    }
  };

  // Handle answer selection - HARD MODE (auto-advance after answer)
  const handleSelectAnswerHard = (key: string) => {
    const questionId = examQuestions[currentIndex]?.id;
    if (questionId && !userAnswers[questionId]) {
      setUserAnswers(prev => ({ ...prev, [questionId]: key }));
      // Immediately advance to next question or submit if last
      if (currentIndex >= examQuestions.length - 1) {
        // Use setTimeout to allow state update before submit
        setTimeout(() => handleAutoSubmit(), 100);
      } else {
        setPhase('transition');
      }
    }
  };

  // Handle time up for current question in HARD MODE
  const handleHardModeTimeUp = useCallback(() => {
    // Move to transition screen or submit if last question
    if (currentIndex >= examQuestions.length - 1) {
      handleAutoSubmit();
    } else {
      setPhase('transition');
    }
  }, [currentIndex, examQuestions.length]);

  // Handle transition complete - move to next question
  const handleTransitionComplete = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
    setPhase('in-progress');
  }, []);

  // Count unanswered questions
  const unansweredCount = useMemo(() => {
    return examQuestions.filter(q => !userAnswers[q.id]).length;
  }, [examQuestions, userAnswers]);

  // Submit button handler (Easy mode only)
  const handleSubmitClick = () => {
    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      handleSubmit();
    }
  };

  // Render mode selection phase
  if (phase === 'select-mode') {
    if (examMcqs.length === 0) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isChapterMode ? 'Test is not available yet for this chapter.' : 'Mock exam is not available yet for this module.'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              No questions have been added.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleGoBack}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <TestModeSelector
        totalMcqs={examMcqs.length}
        secondsPerQuestion={effectiveSecondsPerQuestion}
        onStart={handleStartExam}
        onCancel={handleGoBack}
        isLoading={createAttempt.isPending}
        title={isChapterMode ? 'Test Yourself' : 'Mock Timed Exam'}
        subtitle={moduleName}
      />
    );
  }

  // Render completed phase
  if (phase === 'completed') {
    return (
      <MockExamResults
        moduleId={moduleId}
        moduleName={moduleName}
        questions={examQuestions}
        userAnswers={userAnswers}
        score={finalScore}
        totalQuestions={examQuestions.length}
        durationSeconds={finalDuration}
        chapters={chapters}
      />
    );
  }

  // Render transition phase (Hard Mode only)
  if (phase === 'transition') {
    return (
      <TransitionScreen
        durationSeconds={HARD_MODE_TRANSITION_SECONDS}
        currentQuestion={currentIndex + 1}
        totalQuestions={examQuestions.length}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // Render in-progress phase
  const currentQuestion = examQuestions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = (answeredCount / examQuestions.length) * 100;
  const isTimeLow = testMode === 'easy' && timeRemaining <= 60;

  // HARD MODE RENDER
  if (testMode === 'hard') {
    return (
      <div className="space-y-4">
        {/* Global progress header for hard mode */}
        <div className="sticky top-0 z-10 bg-background pb-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <Button variant="destructive" size="sm" onClick={() => setShowAbortConfirm(true)}>
              Abort
            </Button>
            <Badge variant="outline" className="gap-1">
              {answeredCount}/{examQuestions.length} answered
            </Badge>
            <Badge variant="destructive" className="gap-1">
              Hard Mode
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Current question with per-question timer */}
        {currentQuestion && (
          <HardModeQuestion
            question={currentQuestion}
            questionIndex={currentIndex}
            totalQuestions={examQuestions.length}
            secondsPerQuestion={effectiveSecondsPerQuestion}
            selectedAnswer={userAnswers[currentQuestion.id] || null}
            onSelectAnswer={handleSelectAnswerHard}
            onTimeUp={handleHardModeTimeUp}
          />
        )}
      </div>
    );
  }

  // EASY MODE RENDER
  return (
    <div className="space-y-4">
      {/* Timer and progress header */}
      <div className="sticky top-0 z-10 bg-background pb-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Button variant="destructive" size="sm" onClick={() => setShowAbortConfirm(true)}>
            Abort
          </Button>
          <Badge variant="outline" className="gap-1">
            {answeredCount}/{examQuestions.length} answered
          </Badge>
          <div className={cn(
            "flex items-center gap-2 font-mono text-lg font-semibold",
            isTimeLow && "text-red-600 animate-pulse"
          )}>
            <Clock className="w-5 h-5" />
            {formatDuration(timeRemaining)}
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question navigator (mobile-friendly dots) */}
      <div className="flex flex-wrap gap-1 justify-center">
        {examQuestions.map((q, idx) => {
          const isAnswered = !!userAnswers[q.id];
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered && "bg-primary text-primary-foreground",
                !isAnswered && "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      {currentQuestion && (
        <MockExamQuestion
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={examQuestions.length}
          selectedAnswer={userAnswers[currentQuestion.id] || null}
          onSelectAnswer={handleSelectAnswerEasy}
          onPrevious={() => setCurrentIndex(i => Math.max(0, i - 1))}
          onNext={() => setCurrentIndex(i => Math.min(examQuestions.length - 1, i + 1))}
          canGoPrevious={currentIndex > 0}
          canGoNext={currentIndex < examQuestions.length - 1}
        />
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

      {/* Submit confirmation dialog */}
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
            <AlertDialogAction onClick={handleSubmit}>
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time warning dialog */}
      <AlertDialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              1 Minute Remaining!
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have 1 minute left. The exam will auto-submit when time runs out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Abort confirmation dialog */}
      <AlertDialog open={showAbortConfirm} onOpenChange={setShowAbortConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Abort Exam?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to abort the exam. Your progress will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setPhase('select-mode');
                setShowAbortConfirm(false);
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
