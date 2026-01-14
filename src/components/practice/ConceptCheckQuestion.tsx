import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VPRubric, VPRubricResult } from '@/types/virtualPatient';
import { ConceptCheckResults } from './ConceptCheckResults';

interface GuidedQuestion {
  question: string;
  hint?: string;
  reveal_answer: string;
  rubric?: VPRubric;
}

interface ConceptCheckQuestionProps {
  question: GuidedQuestion;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (answer: string) => VPRubricResult;
  onNext: () => void;
  isLastQuestion: boolean;
}

export function ConceptCheckQuestion({
  question,
  questionNumber,
  totalQuestions,
  onSubmit,
  onNext,
  isLastQuestion,
}: ConceptCheckQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<VPRubricResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasHint = !!question.hint;
  const isSubmitted = result !== null;

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const gradingResult = onSubmit(answer);
      setResult(gradingResult);
      setIsSubmitting(false);
    }, 100);
  };

  const handleNext = () => {
    // Reset state for next question
    setAnswer('');
    setShowHint(false);
    setResult(null);
    onNext();
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          Question {questionNumber} of {totalQuestions}
        </Badge>
        <div className="h-1.5 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium leading-relaxed">
            <span className="text-primary mr-2">🤔</span>
            {question.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hint Button & Content */}
          {hasHint && !isSubmitted && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  showHint && "text-amber-600"
                )}
              >
                <Lightbulb className={cn(
                  "w-4 h-4 mr-1",
                  showHint && "fill-amber-500"
                )} />
                {showHint ? "Hide Hint" : "Show Hint"}
              </Button>
              {showHint && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    💡 {question.hint}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Answer Input */}
          {!isSubmitted && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Your Answer
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here... Include all relevant concepts you can think of."
                  rows={5}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>Grading...</>
                  ) : (
                    <>
                      Submit Answer
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Results */}
          {isSubmitted && result && (
            <ConceptCheckResults
              result={result}
              modelAnswer={question.reveal_answer}
              onNext={handleNext}
              isLastQuestion={isLastQuestion}
              questionNumber={questionNumber}
              totalQuestions={totalQuestions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
