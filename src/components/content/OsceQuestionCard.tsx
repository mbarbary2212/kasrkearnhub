import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  RotateCcw,
  Image as ImageIcon,
  CheckCircle,
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
  const [showExplanations, setShowExplanations] = useState(false);
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
      const score = getScore();
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
        isCorrect: score === 5,
        score,
      });
      hasSavedAttempt.current = true;
    }
  }, [submitted, answers, question.id, chapterId, moduleId, isAdmin, saveAttempt]);

  const handleAnswerChange = (index: number, value: boolean) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [index + 1]: value }));
  };

  const handleSubmit = () => {
    // Check all answered
    if (Object.values(answers).some(a => a === null)) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({ 1: null, 2: null, 3: null, 4: null, 5: null });
    setSubmitted(false);
    setShowExplanations(false);
    // Note: We don't reset hasMarkedComplete - once completed, it stays completed
    // But we do allow re-saving for practice purposes
    hasSavedAttempt.current = false;
  };

  const getScore = () => {
    let correct = 0;
    statements.forEach((s, i) => {
      if (answers[i + 1] === s.correct) correct++;
    });
    return correct;
  };

  const allAnswered = Object.values(answers).every(a => a !== null);
  const isDeleted = question.is_deleted;

  // Check if this question was previously answered
  const wasAttempted = !!previousAttempt;
  const previousScore = previousAttempt?.score ?? null;
  const wasAllCorrect = previousScore === 5;

  return (
    <Card className={cn(
      "overflow-hidden",
      isDeleted && "opacity-60 border-destructive/30 bg-destructive/5",
      wasAttempted && !isDeleted && "ring-1 ring-offset-1",
      wasAttempted && wasAllCorrect && !isDeleted && "ring-green-300 dark:ring-green-700",
      wasAttempted && !wasAllCorrect && !isDeleted && "ring-amber-300 dark:ring-amber-700"
    )}>
      <CardContent className="p-0">
        {/* Image and History - stacked layout */}
        <div className="p-4 border-b space-y-4">
          {/* Header with question number and admin actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Question {questionNumber}</Badge>
              {/* Previously answered indicator */}
              {wasAttempted && !isAdmin && !isDeleted && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    wasAllCorrect 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  {wasAllCorrect ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> 5/5</>
                  ) : (
                    `${previousScore}/5`
                  )}
                </Badge>
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
            const isCorrect = userAnswer === statement.correct;
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  submitted && isCorrect && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                  submitted && !isCorrect && userAnswer !== null && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="font-medium text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="mb-2">{statement.text}</p>
                    
                    <div className="flex items-center gap-4">
                      <RadioGroup
                        value={userAnswer === null ? undefined : userAnswer.toString()}
                        onValueChange={(value) => handleAnswerChange(index, value === 'true')}
                        className="flex gap-4"
                        disabled={submitted}
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="true" id={`q${question.id}-s${index}-true`} />
                          <Label 
                            htmlFor={`q${question.id}-s${index}-true`}
                            className={cn(
                              "cursor-pointer",
                              submitted && statement.correct && "text-green-600 font-medium"
                            )}
                          >
                            True
                          </Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="false" id={`q${question.id}-s${index}-false`} />
                          <Label 
                            htmlFor={`q${question.id}-s${index}-false`}
                            className={cn(
                              "cursor-pointer",
                              submitted && !statement.correct && "text-green-600 font-medium"
                            )}
                          >
                            False
                          </Label>
                        </div>
                      </RadioGroup>

                      {submitted && (
                        isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : userAnswer !== null ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : null
                      )}
                    </div>

                    {/* Explanation - show after submission when toggled */}
                    {submitted && showExplanations && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                        <strong>Explanation:</strong>{' '}
                        {statement.explanation ? (
                          statement.explanation
                        ) : (
                          <span className="italic text-muted-foreground/70">No explanation provided.</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex items-center justify-between">
          {submitted ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={getScore() >= 4 ? "default" : getScore() >= 3 ? "secondary" : "destructive"}>
                  Score: {getScore()}/5
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setShowExplanations(!showExplanations)}>
                  {showExplanations ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showExplanations ? 'Hide' : 'Show'} Explanations
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {Object.values(answers).filter(a => a !== null).length}/5 answered
              </span>
              <Button onClick={handleSubmit} disabled={!allAnswered}>
                Submit Answers
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}