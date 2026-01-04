import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, X, Trophy, Clock, Target, RefreshCw, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OsceQuestion } from '@/hooks/useOsceQuestions';
import { formatDuration } from '@/hooks/useMockExam';

interface UserOsceAnswers {
  [questionId: string]: {
    [statementIndex: number]: boolean;
  };
}

interface OsceExamResultsProps {
  questions: OsceQuestion[];
  userAnswers: UserOsceAnswers;
  score: number;
  totalStatements: number;
  durationSeconds: number;
  onRetry?: () => void;
}

export function OsceExamResults({
  questions,
  userAnswers,
  score,
  totalStatements,
  durationSeconds,
  onRetry,
}: OsceExamResultsProps) {
  const [showReview, setShowReview] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const percentage = Math.round((score / totalStatements) * 100);
  const isPassing = percentage >= 60;

  // Get grade based on percentage
  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-emerald-600' };
    if (percentage >= 80) return { grade: 'A', color: 'text-emerald-600' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 60) return { grade: 'C', color: 'text-amber-600' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-destructive' };
  };

  const { grade, color } = getGrade();

  // Get correct answer for a statement
  const getCorrectAnswer = (question: OsceQuestion, index: number): boolean => {
    const answers: Record<number, boolean> = {
      1: question.answer_1,
      2: question.answer_2,
      3: question.answer_3,
      4: question.answer_4,
      5: question.answer_5,
    };
    return answers[index];
  };

  // Get explanation for a statement
  const getExplanation = (question: OsceQuestion, index: number): string | null => {
    const explanations: Record<number, string | null> = {
      1: question.explanation_1,
      2: question.explanation_2,
      3: question.explanation_3,
      4: question.explanation_4,
      5: question.explanation_5,
    };
    return explanations[index];
  };

  return (
    <div className="space-y-6">
      {/* Results Summary Card */}
      <Card className={cn(
        "border-2",
        isPassing ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-destructive/30 bg-destructive/5"
      )}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
              isPassing ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-destructive/20"
            )}>
              <Trophy className={cn("w-10 h-10", isPassing ? "text-emerald-600" : "text-destructive")} />
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {isPassing ? 'Well Done!' : 'Keep Practicing!'}
              </h2>
              <p className="text-muted-foreground">OSCE Exam Completed</p>
            </div>

            {/* Score Display */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className={cn("text-5xl font-bold", color)}>{percentage}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center">
                <p className={cn("text-4xl font-bold", color)}>{grade}</p>
                <p className="text-sm text-muted-foreground">Grade</p>
              </div>
            </div>

            <Progress value={percentage} className={cn(
              "h-3 max-w-md mx-auto",
              isPassing ? "[&>div]:bg-emerald-500" : "[&>div]:bg-destructive"
            )} />

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
                <Target className="w-4 h-4" />
                {score}/{totalStatements} Correct
              </Badge>
              <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
                <Clock className="w-4 h-4" />
                {formatDuration(durationSeconds)}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
                {questions.length} Questions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => setShowReview(!showReview)} className="gap-2">
          {showReview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showReview ? 'Hide Review' : 'Review Answers'}
        </Button>
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>

      {/* Review Section */}
      {showReview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Review Your Answers</h3>
            <div className="flex items-center gap-2">
              <Switch
                id="show-explanations"
                checked={showExplanations}
                onCheckedChange={setShowExplanations}
              />
              <Label htmlFor="show-explanations" className="text-sm">
                Show Explanations
              </Label>
            </div>
          </div>

          {questions.map((question, qIndex) => {
            const questionAnswers = userAnswers[question.id] || {};
            const statements = [
              { index: 1, text: question.statement_1 },
              { index: 2, text: question.statement_2 },
              { index: 3, text: question.statement_3 },
              { index: 4, text: question.statement_4 },
              { index: 5, text: question.statement_5 },
            ];

            // Count correct for this question
            const correctCount = statements.filter(s => {
              const userAnswer = questionAnswers[s.index];
              const correctAnswer = getCorrectAnswer(question, s.index);
              return userAnswer === correctAnswer;
            }).length;

            return (
              <Card key={question.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                    <Badge variant={correctCount === 5 ? "default" : correctCount >= 3 ? "secondary" : "destructive"}>
                      {correctCount}/5 Correct
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Image */}
                  {question.image_url && (
                    <div className="w-full max-w-[300px] mx-auto">
                      <img
                        src={question.image_url}
                        alt="Clinical image"
                        className="w-full rounded-lg object-contain max-h-[200px]"
                      />
                    </div>
                  )}

                  {/* History */}
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {question.history_text}
                  </div>

                  {/* Statements with answers */}
                  <div className="space-y-2">
                    {statements.map((statement) => {
                      const userAnswer = questionAnswers[statement.index];
                      const correctAnswer = getCorrectAnswer(question, statement.index);
                      const isCorrect = userAnswer === correctAnswer;
                      const explanation = getExplanation(question, statement.index);

                      return (
                        <div
                          key={statement.index}
                          className={cn(
                            "p-3 rounded-lg border",
                            isCorrect ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-destructive/30 bg-destructive/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              isCorrect ? "bg-emerald-100 dark:bg-emerald-900" : "bg-destructive/20"
                            )}>
                              {isCorrect ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <X className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-medium mr-2">{statement.index}.</span>
                                {statement.text}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className="text-muted-foreground">
                                  Your answer: <Badge variant={userAnswer !== undefined ? (isCorrect ? "default" : "destructive") : "outline"} className="ml-1">
                                    {userAnswer !== undefined ? (userAnswer ? 'True' : 'False') : 'No answer'}
                                  </Badge>
                                </span>
                                {!isCorrect && (
                                  <span className="text-muted-foreground">
                                    Correct: <Badge variant="default" className="ml-1 bg-emerald-600">
                                      {correctAnswer ? 'True' : 'False'}
                                    </Badge>
                                  </span>
                                )}
                              </div>
                              {showExplanations && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  {explanation || 'No explanation provided.'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
