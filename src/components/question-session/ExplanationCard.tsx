import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mcq } from '@/hooks/useMcqs';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';

interface ExplanationCardProps {
  questionType: 'mcq' | 'sba' | 'osce';
  question: Mcq | OsceQuestion;
  isCorrect: boolean | null;
}

function isMcq(q: Mcq | OsceQuestion): q is Mcq {
  return 'stem' in q && 'choices' in q;
}

export function ExplanationCard({ questionType, question, isCorrect }: ExplanationCardProps) {
  if (questionType === 'osce') {
    const q = question as OsceQuestion;
    const statements = [
      { num: 1, text: q.statement_1, correct: q.answer_1, explanation: q.explanation_1 },
      { num: 2, text: q.statement_2, correct: q.answer_2, explanation: q.explanation_2 },
      { num: 3, text: q.statement_3, correct: q.answer_3, explanation: q.explanation_3 },
      { num: 4, text: q.statement_4, correct: q.answer_4, explanation: q.explanation_4 },
      { num: 5, text: q.statement_5, correct: q.answer_5, explanation: q.explanation_5 },
    ];

    const hasExplanations = statements.some(s => s.explanation);

    return (
      <Card className="border-2 border-primary/20 shadow-sm">
        <CardHeader className={cn(
          'py-3 px-4 rounded-t-lg',
          isCorrect
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        )}>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {isCorrect ? (
              <><Check className="h-4 w-4 text-green-600" /><span className="text-green-700 dark:text-green-400">All Correct!</span></>
            ) : (
              <><X className="h-4 w-4 text-red-600" /><span className="text-red-700 dark:text-red-400">Review Needed</span></>
            )}
          </CardTitle>
        </CardHeader>
        {hasExplanations && (
          <CardContent className="pt-3 pb-3 px-4 space-y-2">
            {statements.map(s => s.explanation && (
              <div key={s.num} className="text-xs leading-relaxed">
                <span className="font-medium text-muted-foreground">S{s.num}:</span>{' '}
                <span className="text-foreground">{s.explanation}</span>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    );
  }

  // MCQ/SBA
  const mcq = question as Mcq;
  const correctChoice = mcq.choices.find(c => c.key === mcq.correct_key);

  return (
    <Card className="border-2 border-primary/20 shadow-sm">
      <CardHeader className={cn(
        'py-3 px-4 rounded-t-lg',
        isCorrect
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-red-50 dark:bg-red-900/20'
      )}>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {isCorrect ? (
            <><Check className="h-4 w-4 text-green-600" /><span className="text-green-700 dark:text-green-400">Correct!</span></>
          ) : (
            <><X className="h-4 w-4 text-red-600" /><span className="text-red-700 dark:text-red-400">Incorrect</span></>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 px-4 space-y-2">
        <div className="text-xs">
          <span className="font-medium text-muted-foreground">Correct answer: </span>
          <span className="font-semibold text-foreground">
            {mcq.correct_key}. {correctChoice?.text}
          </span>
        </div>
        {mcq.explanation && (
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {mcq.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
