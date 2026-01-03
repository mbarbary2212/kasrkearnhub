import { useState, useEffect, useCallback, useMemo } from 'react';
import { Mcq } from '@/hooks/useMcqs';
import { 
  MockExamSettings, 
  useCreateMockExamAttempt, 
  useSubmitMockExam,
  formatDuration,
} from '@/hooks/useMockExam';
import { MockExamQuestion } from './MockExamQuestion';
import { MockExamResults } from './MockExamResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Flag, 
  CircleDot,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleChapter } from '@/hooks/useChapters';

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

type ExamPhase = 'ready' | 'in-progress' | 'completed';

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
  questionCount: propQuestionCount,
  secondsPerQuestion: propSecondsPerQuestion,
}: MockTimedExamProps) {
  const createAttempt = useCreateMockExamAttempt();
  const submitExam = useSubmitMockExam();

  const [phase, setPhase] = useState<ExamPhase>('ready');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<Mcq[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);

  // Use chapter MCQs if provided, otherwise use module MCQs
  const examMcqs = chapterMcqs || mcqs || [];
  const isChapterMode = !!chapterMcqs;
  
  // Calculate exam parameters - use props for chapter mode, settings for module mode
  const effectiveQuestionCount = propQuestionCount ?? (settings ? Math.min(settings.question_count, examMcqs.length) : examMcqs.length);
  const effectiveSecondsPerQuestion = propSecondsPerQuestion ?? settings?.seconds_per_question ?? 60;
  const questionCount = Math.min(effectiveQuestionCount, examMcqs.length);
  const totalTime = questionCount * effectiveSecondsPerQuestion;

  // Handler for going back - supports both modes
  const handleGoBack = () => {
    if (onComplete) {
      onComplete();
    } else if (onBack) {
      onBack();
    }
  };

  // Shuffle and select questions
  const selectQuestions = useCallback(() => {
    const shuffled = [...examMcqs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, questionCount);
  }, [examMcqs, questionCount]);

  // Start the exam
  const handleStartExam = async () => {
    const selected = selectQuestions();
    setExamQuestions(selected);
    setTimeRemaining(totalTime);
    setStartTime(new Date());
    setUserAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentIndex(0);

    try {
      const result = await createAttempt.mutateAsync({
        moduleId,
        questionIds: selected.map(q => q.id),
      });
      setAttemptId(result.id);
      setPhase('in-progress');
    } catch {
      // Error handled by mutation
    }
  };

  // Timer effect
  useEffect(() => {
    if (phase !== 'in-progress') return;

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
  }, [phase]);

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

  // Auto-submit when time runs out
  const handleAutoSubmit = async () => {
    if (!attemptId || !startTime || phase !== 'in-progress') return;

    const score = calculateScore();
    const duration = totalTime; // Full time used

    try {
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

  // Handle answer selection with auto-progress
  const handleSelectAnswer = (key: string) => {
    const questionId = examQuestions[currentIndex]?.id;
    if (questionId) {
      setUserAnswers(prev => ({ ...prev, [questionId]: key }));
      
      // Auto-progress to next question after a short delay (1.5 seconds)
      if (currentIndex < examQuestions.length - 1) {
        setTimeout(() => {
          setCurrentIndex(i => Math.min(examQuestions.length - 1, i + 1));
        }, 1500);
      }
    }
  };

  // Handle flag toggle
  const handleToggleFlag = () => {
    const questionId = examQuestions[currentIndex]?.id;
    if (questionId) {
      setFlaggedQuestions(prev => {
        const next = new Set(prev);
        if (next.has(questionId)) {
          next.delete(questionId);
        } else {
          next.add(questionId);
        }
        return next;
      });
    }
  };

  // Count unanswered questions
  const unansweredCount = useMemo(() => {
    return examQuestions.filter(q => !userAnswers[q.id]).length;
  }, [examQuestions, userAnswers]);

  // Submit button handler
  const handleSubmitClick = () => {
    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      handleSubmit();
    }
  };

  // Render ready phase
  if (phase === 'ready') {
    if (examMcqs.length === 0) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isChapterMode ? 'Test is not available yet for this chapter.' : 'Mock exam is not available yet for this module.'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              No MCQs have been added.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleGoBack}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{isChapterMode ? 'Test Yourself' : 'Mock Timed Exam'}</CardTitle>
          <CardDescription>{moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <CircleDot className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{questionCount} Questions</p>
                <p className="text-sm text-muted-foreground">MCQ format</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{formatDuration(totalTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {effectiveSecondsPerQuestion}s per question
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Test Rules
                </p>
                <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>• Complete within the time limit</li>
                  <li>• Answers are hidden until submission</li>
                  <li>• You can flag questions to review later</li>
                  <li>• Test auto-submits when time expires</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleGoBack} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleStartExam} 
              className="flex-1 gap-2"
              disabled={createAttempt.isPending}
            >
              <Play className="w-4 h-4" />
              {createAttempt.isPending ? 'Starting...' : 'Start Test'}
            </Button>
          </div>
        </CardContent>
      </Card>
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

  // Render in-progress phase
  const currentQuestion = examQuestions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = (answeredCount / examQuestions.length) * 100;
  const isTimeLow = timeRemaining <= 60;

  return (
    <div className="space-y-4">
      {/* Timer and progress header */}
      <div className="sticky top-0 z-10 bg-background pb-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {answeredCount}/{examQuestions.length} answered
            </Badge>
            {flaggedQuestions.size > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Flag className="w-3 h-3" />
                {flaggedQuestions.size} flagged
              </Badge>
            )}
          </div>
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
          const isFlagged = flaggedQuestions.has(q.id);
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered && !isFlagged && "bg-primary text-primary-foreground",
                isFlagged && "bg-amber-500 text-white",
                !isAnswered && !isFlagged && "bg-muted text-muted-foreground"
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
          isFlagged={flaggedQuestions.has(currentQuestion.id)}
          onSelectAnswer={handleSelectAnswer}
          onToggleFlag={handleToggleFlag}
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
    </div>
  );
}
