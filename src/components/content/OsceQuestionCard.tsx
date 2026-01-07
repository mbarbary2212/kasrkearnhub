import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  Edit, 
  Trash2, 
  RotateCcw,
  Image as ImageIcon,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OsceQuestion } from '@/hooks/useOsceQuestions';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useSaveQuestionAttempt, QuestionAttempt } from '@/hooks/useQuestionAttempts';
import type { Json } from '@/integrations/supabase/types';

interface OsceQuestionCardProps {
  question: OsceQuestion;
  questionNumber: number;
  isAdmin?: boolean;
  chapterId?: string;
  moduleId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  // Previous attempt data for restoring state
  previousAttempt?: QuestionAttempt | null;
  // Starred support
  isStarred?: boolean;
  onToggleStar?: (id: string) => void;
}

export function OsceQuestionCard({
  question,
  questionNumber,
  isAdmin = false,
  chapterId,
  moduleId,
  onEdit,
  onDelete,
  onRestore,
  previousAttempt,
  isStarred = false,
  onToggleStar,
}: OsceQuestionCardProps) {
  // Restore previous answers if available
  const initialAnswers = useMemo(() => {
    if (previousAttempt?.selected_answer && typeof previousAttempt.selected_answer === 'object') {
      const savedAnswers = previousAttempt.selected_answer as Record<string, boolean>;
      return {
        1: savedAnswers['1'] ?? null,
        2: savedAnswers['2'] ?? null,
        3: savedAnswers['3'] ?? null,
        4: savedAnswers['4'] ?? null,
        5: savedAnswers['5'] ?? null,
      };
    }
    return { 1: null, 2: null, 3: null, 4: null, 5: null };
  }, [previousAttempt]);

  const [answers, setAnswers] = useState<Record<number, boolean | null>>(initialAnswers);
  const [submitted, setSubmitted] = useState(!!previousAttempt);
  const hasMarkedComplete = useRef(!!previousAttempt);
  const hasSavedAttempt = useRef(!!previousAttempt);
  const { markComplete } = useMarkItemComplete();
  const saveAttempt = useSaveQuestionAttempt();

  const statements = [
    { text: question.statement_1, correct: question.answer_1, explanation: question.explanation_1 },
    { text: question.statement_2, correct: question.answer_2, explanation: question.explanation_2 },
    { text: question.statement_3, correct: question.answer_3, explanation: question.explanation_3 },
    { text: question.statement_4, correct: question.answer_4, explanation: question.explanation_4 },
    { text: question.statement_5, correct: question.answer_5, explanation: question.explanation_5 },
  ];

  // Calculate score
  const getScore = () => {
    let correct = 0;
    statements.forEach((s, i) => {
      if (answers[i + 1] === s.correct) correct++;
    });
    return correct;
  };

  const score = submitted ? getScore() : 0;
  const isAllCorrect = score === 5;

  // Mark as complete when submitted (all T/F statements answered)
  useEffect(() => {
    if (submitted && !hasMarkedComplete.current && !isAdmin && chapterId) {
      markComplete(question.id, 'osce', chapterId);
      hasMarkedComplete.current = true;
    }
  }, [submitted, question.id, chapterId, isAdmin, markComplete]);

  // Auto-save attempt when submitted
  useEffect(() => {
    if (submitted && !hasSavedAttempt.current && !isAdmin && chapterId && moduleId) {
      const currentScore = getScore();
      const selectedAnswer: Record<string, boolean> = {};
      Object.entries(answers).forEach(([key, value]) => {
        if (value !== null) {
          selectedAnswer[key] = value;
        }
      });
      
      saveAttempt.mutate({
        questionId: question.id,
        questionType: 'osce',
        chapterId,
        moduleId,
        selectedAnswer: selectedAnswer as unknown as Json,
        isCorrect: currentScore === 5,
        score: currentScore,
      });
      hasSavedAttempt.current = true;
    }
  }, [submitted, answers, question.id, chapterId, moduleId, isAdmin, saveAttempt]);

  const handleAnswerChange = (index: number, value: boolean) => {
    if (submitted) {
      // Reset to try again mode if user changes an answer after submission
      setAnswers(prev => ({ ...prev, [index + 1]: value }));
      setSubmitted(false);
      hasSavedAttempt.current = false;
    } else {
      setAnswers(prev => ({ ...prev, [index + 1]: value }));
    }
  };

  const handleSubmit = () => {
    // Check all answered
    if (Object.values(answers).some(a => a === null)) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({ 1: null, 2: null, 3: null, 4: null, 5: null });
    setSubmitted(false);
    hasSavedAttempt.current = false;
  };

  const allAnswered = Object.values(answers).every(a => a !== null);
  const isDeleted = question.is_deleted;

  // Status based on last attempt
  const statusLabel = useMemo(() => {
    if (!previousAttempt) return null;
    return previousAttempt.is_correct ? 'Correct' : 'Attempted';
  }, [previousAttempt]);

  // Score badge color
  const getScoreBadgeVariant = (s: number) => {
    if (s === 5) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s >= 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <Card className={cn(
      "overflow-hidden",
      isDeleted && "opacity-60 border-destructive/30 bg-destructive/5",
      previousAttempt && !isDeleted && "ring-1 ring-offset-1",
      previousAttempt && previousAttempt.is_correct && !isDeleted && "ring-green-300 dark:ring-green-700",
      previousAttempt && !previousAttempt.is_correct && !isDeleted && "ring-amber-300 dark:ring-amber-700"
    )}>
      <CardContent className="p-0">
        {/* Image and History - stacked layout */}
        <div className="p-4 border-b space-y-4">
          {/* Header with question number and admin actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Question {questionNumber}</Badge>
              {/* Status indicator based on last attempt */}
              {statusLabel && !isAdmin && !isDeleted && (
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
              {/* Score badge for previously attempted */}
              {previousAttempt && previousAttempt.score !== null && !isAdmin && !isDeleted && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getScoreBadgeVariant(previousAttempt.score))}
                >
                  {previousAttempt.score}/5
                </Badge>
              )}
              {/* Star toggle */}
              {onToggleStar && !isAdmin && (
                <button
                  onClick={() => onToggleStar(question.id)}
                  className={cn(
                    'p-1 rounded-full transition-colors hover:bg-muted',
                    isStarred ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                  )}
                  title={isStarred ? 'Remove star' : 'Star for review'}
                >
                  <Star className={cn('h-4 w-4', isStarred && 'fill-current')} />
                </button>
              )}
            </div>
            {isDeleted && (
              <Badge variant="destructive">Deleted</Badge>
            )}
            {isAdmin && !isDeleted && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
            {isAdmin && isDeleted && (
              <Button variant="ghost" size="sm" onClick={onRestore}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
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
        <div className="p-4 space-y-4">
          <h4 className="font-medium">Select True or False for each statement:</h4>
          
          {statements.map((statement, index) => {
            const userAnswer = answers[index + 1];
            const isCorrectAnswer = userAnswer === statement.correct;
            const showFeedback = submitted && userAnswer !== null;
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border-2 transition-colors",
                  showFeedback && isCorrectAnswer && "border-green-500 bg-green-500/10",
                  showFeedback && !isCorrectAnswer && "border-red-500 bg-red-500/10",
                  !showFeedback && "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="font-medium text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <p className="mb-2">{statement.text}</p>
                    
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* True button */}
                      <button
                        onClick={() => handleAnswerChange(index, true)}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 font-medium transition-all flex items-center gap-2",
                          !submitted && userAnswer === true && "border-primary bg-primary/10 text-primary",
                          !submitted && userAnswer !== true && "border-border hover:border-primary/50 hover:bg-muted/50",
                          submitted && statement.correct === true && "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
                          submitted && userAnswer === true && statement.correct !== true && "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
                          submitted && userAnswer !== true && statement.correct !== true && "border-border opacity-60"
                        )}
                      >
                        True
                        {submitted && statement.correct === true && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {submitted && userAnswer === true && statement.correct !== true && (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </button>
                      
                      {/* False button */}
                      <button
                        onClick={() => handleAnswerChange(index, false)}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 font-medium transition-all flex items-center gap-2",
                          !submitted && userAnswer === false && "border-primary bg-primary/10 text-primary",
                          !submitted && userAnswer !== false && "border-border hover:border-primary/50 hover:bg-muted/50",
                          submitted && statement.correct === false && "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
                          submitted && userAnswer === false && statement.correct !== false && "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
                          submitted && userAnswer !== false && statement.correct !== false && "border-border opacity-60"
                        )}
                      >
                        False
                        {submitted && statement.correct === false && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {submitted && userAnswer === false && statement.correct !== false && (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </button>

                      {/* Result icon for accessibility */}
                      {showFeedback && (
                        <span className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          isCorrectAnswer ? "text-green-600" : "text-red-600"
                        )}>
                          {isCorrectAnswer ? (
                            <><Check className="h-5 w-5" /> Correct</>
                          ) : (
                            <><X className="h-5 w-5" /> Incorrect</>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Explanation - shown automatically after submission */}
                    {submitted && statement.explanation && (
                      <div className="mt-2 p-2 rounded bg-muted text-sm">
                        <strong>Explanation:</strong> {statement.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex items-center justify-between flex-wrap gap-2">
          {submitted ? (
            <>
              <div className="flex items-center gap-2">
                {/* Score badge with color coding */}
                <Badge 
                  variant="secondary"
                  className={cn("text-sm", getScoreBadgeVariant(score))}
                >
                  Score: {score}/5
                </Badge>
                {/* Feedback message */}
                <span className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  isAllCorrect ? "text-green-600" : "text-amber-600"
                )}>
                  {isAllCorrect ? (
                    <><Check className="h-4 w-4" /> All Correct!</>
                  ) : (
                    <><X className="h-4 w-4" /> {5 - score} incorrect</>
                  )}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Try Again
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {Object.values(answers).filter(a => a !== null).length}/5 answered
              </span>
              <Button onClick={handleSubmit} disabled={!allAnswered} className="gap-2">
                <Check className="h-4 w-4" />
                Submit OSCE
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
