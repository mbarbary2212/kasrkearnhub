import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExamAttemptAnswers } from '@/hooks/useExamResults';
import { formatDuration } from '@/hooks/useMockExam';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle, XCircle, Clock, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminAttemptDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: {
    id: string;
    user_id: string;
    score: number;
    total_questions: number;
    duration_seconds: number | null;
    submitted_at: string | null;
    test_mode: string;
    question_ids: string[];
    user_answers: Record<string, string>;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
}

function useAttemptMcqs(questionIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['admin-attempt-mcqs', questionIds],
    queryFn: async () => {
      if (questionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('mcqs')
        .select('id, stem, choices, correct_key, explanation, chapter_id')
        .in('id', questionIds);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}

function useAttemptEssays(answerQuestionIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['admin-attempt-essays', answerQuestionIds],
    queryFn: async () => {
      if (answerQuestionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('essays')
        .select('id, title, question, model_answer, keywords')
        .in('id', answerQuestionIds);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}

const TEST_MODE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  easy: { label: 'Easy', variant: 'secondary' },
  hard: { label: 'Hard', variant: 'destructive' },
  blueprint: { label: 'Blueprint', variant: 'default' },
};

export function AdminAttemptDetailModal({ open, onOpenChange, attempt }: AdminAttemptDetailModalProps) {
  const { data: essayAnswers, isLoading: essayAnswersLoading } = useExamAttemptAnswers(
    open && attempt ? attempt.id : undefined
  );

  const mcqQuestionIds = attempt?.question_ids || [];
  const { data: mcqs, isLoading: mcqsLoading } = useAttemptMcqs(mcqQuestionIds, open && !!attempt);

  const essayQuestionIds = (essayAnswers || [])
    .filter(a => a.question_type === 'essay')
    .map(a => a.question_id);
  const { data: essays, isLoading: essaysLoading } = useAttemptEssays(essayQuestionIds, essayQuestionIds.length > 0);

  if (!attempt) return null;

  const percentage = attempt.total_questions > 0
    ? Math.round((attempt.score / attempt.total_questions) * 100)
    : 0;

  const modeInfo = TEST_MODE_LABELS[attempt.test_mode] || { label: attempt.test_mode, variant: 'outline' as const };
  const userAnswers = (attempt.user_answers || {}) as Record<string, string>;
  const studentName = attempt.profiles?.full_name || 'Unknown Student';

  const isLoading = mcqsLoading || essayAnswersLoading || essaysLoading;

  const essayOnlyAnswers = (essayAnswers || []).filter(a => a.question_type === 'essay');
  const essayTotalScore = essayOnlyAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
  const essayMaxScore = essayOnlyAnswers.reduce((sum, a) => sum + (a.max_score || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {studentName}
            <Badge variant={modeInfo.variant}>{modeInfo.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            {attempt.submitted_at
              ? format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')
              : 'Not submitted'}
          </DialogDescription>
        </DialogHeader>

        {/* Score Summary */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-3xl font-bold",
                percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {percentage}%
              </span>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {attempt.score}/{attempt.total_questions} MCQs
                </span>
                {essayMaxScore > 0 && (
                  <span>{essayTotalScore}/{essayMaxScore} Essay</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {attempt.duration_seconds ? formatDuration(attempt.duration_seconds) : '-'}
                </span>
              </div>
            </div>
            <Progress value={percentage} className="h-2" />
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            {/* MCQ Review */}
            {mcqs && mcqs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">MCQ Review ({attempt.score}/{mcqs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {mcqs.map((q: any, index: number) => {
                      const userAnswer = userAnswers[q.id];
                      const isCorrect = userAnswer === q.correct_key;
                      const choices = (q.choices || []) as { key: string; text: string }[];

                      return (
                        <AccordionItem key={q.id} value={q.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                              )}
                              <span className="text-sm font-medium">
                                Q{index + 1}. {q.stem?.slice(0, 80)}{q.stem?.length > 80 ? '...' : ''}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2">
                            <p className="font-medium">{q.stem}</p>
                            <div className="space-y-2">
                              {choices.map((choice) => {
                                const isUserAnswer = userAnswer === choice.key;
                                const isCorrectAnswer = q.correct_key === choice.key;

                                return (
                                  <div
                                    key={choice.key}
                                    className={cn(
                                      "flex items-start gap-2 p-2 rounded border",
                                      isCorrectAnswer && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                                      isUserAnswer && !isCorrectAnswer && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                                      !isUserAnswer && !isCorrectAnswer && "border-muted"
                                    )}
                                  >
                                    <span className="font-semibold">{choice.key}.</span>
                                    <span className="flex-1">{choice.text}</span>
                                    {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                                    {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                            {!userAnswer && (
                              <p className="text-sm text-muted-foreground italic">Student did not answer this question.</p>
                            )}
                            {q.explanation && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Explanation:</p>
                                <p className="text-sm text-muted-foreground">{q.explanation}</p>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Essay Review */}
            {essayOnlyAnswers.length > 0 && essays && essays.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Essay Review ({essayTotalScore}/{essayMaxScore})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {essayOnlyAnswers.map((answer, index) => {
                      const essay = essays.find((e: any) => e.id === answer.question_id);
                      if (!essay) return null;

                      const feedback = answer.marking_feedback as {
                        matched_required?: string[];
                        missing_required?: string[];
                        matched_optional?: string[];
                      } | null;

                      const scorePercent = answer.max_score && answer.score !== null
                        ? Math.round((answer.score / answer.max_score) * 100)
                        : null;

                      return (
                        <AccordionItem key={answer.id} value={answer.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              {scorePercent !== null && scorePercent >= 60 ? (
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                              )}
                              <span className="text-sm font-medium">
                                Essay {index + 1}. {essay.title}
                              </span>
                              {answer.score !== null && answer.max_score !== null && (
                                <Badge variant="outline" className="ml-auto mr-2">
                                  {answer.score}/{answer.max_score}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2">
                            <div>
                              <p className="text-sm font-medium mb-1">Question:</p>
                              <p className="text-sm text-muted-foreground">{essay.question}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Student's Answer:</p>
                              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                {answer.typed_text || answer.typed_summary || (
                                  <span className="text-muted-foreground italic">No answer provided</span>
                                )}
                              </div>
                            </div>
                            {feedback && (
                              <div className="space-y-3">
                                {feedback.matched_required && feedback.matched_required.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1.5 text-green-700 dark:text-green-400">✓ Matched Concepts</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {feedback.matched_required.map((c, i) => (
                                        <Badge key={i} variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">{c}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {feedback.missing_required && feedback.missing_required.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1.5 text-red-700 dark:text-red-400">✗ Missing Concepts</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {feedback.missing_required.map((c, i) => (
                                        <Badge key={i} variant="outline" className="bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">{c}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {feedback.matched_optional && feedback.matched_optional.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1.5 text-blue-700 dark:text-blue-400">★ Bonus Concepts</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {feedback.matched_optional.map((c, i) => (
                                        <Badge key={i} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">{c}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
