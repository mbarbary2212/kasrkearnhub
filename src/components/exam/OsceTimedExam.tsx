import { useState, useEffect, useCallback, useMemo } from 'react';
import { OsceQuestion } from '@/hooks/useOsceQuestions';
import { formatDuration } from '@/hooks/useMockExam';
import { TestModeSelector, TestMode } from './TestModeSelector';
import { OsceExamQuestion } from './OsceExamQuestion';
import { HardModeOsceQuestion } from './HardModeOsceQuestion';
import { TransitionScreen } from './TransitionScreen';
import { OsceExamResults } from './OsceExamResults';
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
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OsceTimedExamProps {
  moduleId: string;
  chapterId?: string;
  osceQuestions: OsceQuestion[];
  onComplete?: () => void;
  secondsPerQuestion?: number;
}

type ExamPhase = 'select-mode' | 'in-progress' | 'transition' | 'completed';

interface UserOsceAnswers {
  [questionId: string]: {
    [statementIndex: number]: boolean;
  };
}

// Transition delay between questions in hard mode (seconds)
const HARD_MODE_TRANSITION_SECONDS = 3;

// Default time per OSCE question for easy mode
const DEFAULT_SECONDS_PER_OSCE = 90;

// Hard mode: 2.5 minutes (150 seconds) per OSCE question
const HARD_MODE_SECONDS_PER_OSCE = 150;

export function OsceTimedExam({
  moduleId,
  chapterId,
  osceQuestions,
  onComplete,
  secondsPerQuestion: propSecondsPerQuestion,
}: OsceTimedExamProps) {
  const [phase, setPhase] = useState<ExamPhase>('select-mode');
  const [testMode, setTestMode] = useState<TestMode>('easy');
  const [examQuestions, setExamQuestions] = useState<OsceQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserOsceAnswers>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSecondsPerQuestion = propSecondsPerQuestion ?? DEFAULT_SECONDS_PER_OSCE;

  // Handler for going back
  const handleGoBack = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Shuffle and select questions
  const selectQuestions = useCallback((count: number) => {
    const shuffled = [...osceQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [osceQuestions]);

  // Start the exam
  const handleStartExam = async (mode: TestMode, questionCount: number) => {
    const selected = selectQuestions(questionCount);
    setExamQuestions(selected);
    setTestMode(mode);
    setTimeRemaining(questionCount * effectiveSecondsPerQuestion);
    setStartTime(new Date());
    setUserAnswers({});
    setCurrentIndex(0);
    setPhase('in-progress');
  };

  // Timer effect for EASY MODE only (global timer)
  useEffect(() => {
    if (phase !== 'in-progress' || testMode !== 'easy') return;

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
  }, [phase, testMode]);

  // Calculate score - count correct statements across all questions
  const calculateScore = useCallback(() => {
    let correct = 0;
    examQuestions.forEach(q => {
      const questionAnswers = userAnswers[q.id] || {};
      const correctAnswers: Record<number, boolean> = {
        1: q.answer_1,
        2: q.answer_2,
        3: q.answer_3,
        4: q.answer_4,
        5: q.answer_5,
      };
      
      for (let i = 1; i <= 5; i++) {
        if (questionAnswers[i] === correctAnswers[i]) {
          correct++;
        }
      }
    });
    return correct;
  }, [examQuestions, userAnswers]);

  // Submit exam
  const handleSubmit = async () => {
    if (!startTime || isSubmitting) return;
    setIsSubmitting(true);

    const score = calculateScore();
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    setFinalScore(score);
    setFinalDuration(duration);
    setPhase('completed');
    setIsSubmitting(false);
  };

  // Auto-submit when time runs out
  const handleAutoSubmit = async () => {
    if (!startTime || (phase !== 'in-progress' && phase !== 'transition')) return;

    const score = calculateScore();
    const duration = testMode === 'easy' 
      ? examQuestions.length * effectiveSecondsPerQuestion
      : Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    setFinalScore(score);
    setFinalDuration(duration);
    setPhase('completed');
  };

  // Handle answer selection - both modes
  const handleSelectAnswer = (statementIndex: number, value: boolean) => {
    const questionId = examQuestions[currentIndex]?.id;
    if (questionId) {
      setUserAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || {}),
          [statementIndex]: value,
        },
      }));
    }
  };

  // Handle time up for current question in HARD MODE
  const handleHardModeTimeUp = useCallback(() => {
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

  // Count total answered statements
  const totalAnsweredStatements = useMemo(() => {
    let count = 0;
    Object.values(userAnswers).forEach(questionAnswers => {
      count += Object.keys(questionAnswers).length;
    });
    return count;
  }, [userAnswers]);

  const totalStatements = examQuestions.length * 5;

  // Check if all statements answered
  const allAnswered = totalAnsweredStatements === totalStatements;

  // Submit button handler (Easy mode only)
  const handleSubmitClick = () => {
    if (!allAnswered) {
      setShowSubmitConfirm(true);
    } else {
      handleSubmit();
    }
  };

  // Handle retry
  const handleRetry = () => {
    setPhase('select-mode');
    setExamQuestions([]);
    setUserAnswers({});
    setCurrentIndex(0);
  };

  // Render mode selection phase
  if (phase === 'select-mode') {
    if (osceQuestions.length === 0) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              OSCE test is not available yet for this chapter.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              No OSCE questions have been added.
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
        totalMcqs={osceQuestions.length}
        secondsPerQuestion={effectiveSecondsPerQuestion}
        onStart={handleStartExam}
        onCancel={handleGoBack}
        title="OSCE Test"
        subtitle="Test your clinical examination skills"
      />
    );
  }

  // Render completed phase
  if (phase === 'completed') {
    return (
      <OsceExamResults
        questions={examQuestions}
        userAnswers={userAnswers}
        score={finalScore}
        totalStatements={totalStatements}
        durationSeconds={finalDuration}
        onRetry={handleRetry}
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
  const currentQuestionAnswers = userAnswers[currentQuestion?.id] || {};
  const progressPercent = (totalAnsweredStatements / totalStatements) * 100;
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
              {totalAnsweredStatements}/{totalStatements} answered
            </Badge>
            <Badge variant="destructive" className="gap-1">
              Hard Mode
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Current question with per-question timer */}
        {currentQuestion && (
          <HardModeOsceQuestion
            question={currentQuestion}
            questionIndex={currentIndex}
            totalQuestions={examQuestions.length}
            secondsPerQuestion={HARD_MODE_SECONDS_PER_OSCE}
            userAnswers={currentQuestionAnswers}
            onSelectAnswer={handleSelectAnswer}
            onTimeUp={handleHardModeTimeUp}
          />
        )}

        {/* Next button for hard mode - submit when all 5 statements answered or move to next */}
        <div className="pt-4 border-t">
          <Button
            onClick={() => {
              if (currentIndex >= examQuestions.length - 1) {
                handleAutoSubmit();
              } else {
                setPhase('transition');
              }
            }}
            className="w-full"
            size="lg"
          >
            {currentIndex >= examQuestions.length - 1 ? 'Submit Exam' : 'Next Question'}
          </Button>
        </div>

        {/* Abort dialog */}
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
              <AlertDialogCancel>Continue</AlertDialogCancel>
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
            {totalAnsweredStatements}/{totalStatements} answered
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
          const questionAnswers = userAnswers[q.id] || {};
          const answeredCount = Object.keys(questionAnswers).length;
          const isFullyAnswered = answeredCount === 5;
          const isPartiallyAnswered = answeredCount > 0 && answeredCount < 5;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isFullyAnswered && "bg-primary text-primary-foreground",
                isPartiallyAnswered && "bg-primary/50 text-primary-foreground",
                !isFullyAnswered && !isPartiallyAnswered && "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      {currentQuestion && (
        <OsceExamQuestion
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={examQuestions.length}
          userAnswers={currentQuestionAnswers}
          onSelectAnswer={handleSelectAnswer}
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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </Button>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit with unanswered statements?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {totalStatements - totalAnsweredStatements} unanswered statement{totalStatements - totalAnsweredStatements > 1 ? 's' : ''}. 
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
              The exam will auto-submit when time runs out.
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
              Your progress will not be saved. Are you sure?
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
