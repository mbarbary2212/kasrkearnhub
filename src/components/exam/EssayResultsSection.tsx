import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, XCircle, FileText, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExamAttemptAnswer, RecheckRequest } from '@/hooks/useExamResults';
import { RecheckRequestModal } from './RecheckRequestModal';

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer: string | null;
  keywords: string[] | null;
}

interface EssayResultsSectionProps {
  essays: Essay[];
  essayAnswers: ExamAttemptAnswer[];
  attemptId: string;
  recheckRequests?: RecheckRequest[];
}

export function EssayResultsSection({
  essays,
  essayAnswers,
  attemptId,
  recheckRequests = [],
}: EssayResultsSectionProps) {
  const [recheckModal, setRecheckModal] = useState<{
    open: boolean;
    answerId: string;
    questionTitle: string;
    score: number | null;
    maxScore: number | null;
  }>({ open: false, answerId: '', questionTitle: '', score: null, maxScore: null });

  if (essayAnswers.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Short Questions Review
          </CardTitle>
          <CardDescription>
            Review your short question answers with automated marking feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {essayAnswers.map((answer, index) => {
              const essay = essays.find(e => e.id === answer.question_id);
              if (!essay) return null;

              const feedback = answer.marking_feedback as {
                matched_required?: string[];
                missing_required?: string[];
                matched_optional?: string[];
                rubric_score?: number;
              } | null;

              const hasRecheck = recheckRequests.some(r => r.answer_id === answer.id);
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
                        Q{index + 1}. {essay.title}
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
                      <p className="text-sm font-medium mb-1">Your Answer:</p>
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {answer.typed_text || answer.typed_summary || (
                          <span className="text-muted-foreground italic">No answer provided</span>
                        )}
                      </div>
                    </div>

                    {/* Marking Feedback */}
                    {feedback && (
                      <div className="space-y-3">
                        {feedback.matched_required && feedback.matched_required.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1.5 text-green-700 dark:text-green-400">
                              ✓ Matched Concepts
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {feedback.matched_required.map((concept, i) => (
                                <Badge key={i} variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {feedback.missing_required && feedback.missing_required.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1.5 text-red-700 dark:text-red-400">
                              ✗ Missing Concepts
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {feedback.missing_required.map((concept, i) => (
                                <Badge key={i} variant="outline" className="bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {feedback.matched_optional && feedback.matched_optional.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1.5 text-blue-700 dark:text-blue-400">
                              ★ Bonus Concepts
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {feedback.matched_optional.map((concept, i) => (
                                <Badge key={i} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recheck button */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {hasRecheck ? (
                        <Badge variant="secondary" className="gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Recheck Requested
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setRecheckModal({
                            open: true,
                            answerId: answer.id,
                            questionTitle: essay.title,
                            score: answer.score,
                            maxScore: answer.max_score,
                          })}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Request Rechecking
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <RecheckRequestModal
        open={recheckModal.open}
        onOpenChange={(open) => setRecheckModal(prev => ({ ...prev, open }))}
        attemptId={attemptId}
        answerId={recheckModal.answerId}
        questionTitle={recheckModal.questionTitle}
        currentScore={recheckModal.score}
        maxScore={recheckModal.maxScore}
      />
    </>
  );
}
