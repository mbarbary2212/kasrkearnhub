import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCaseQuestionModelAnswer } from '@/hooks/useCaseScenarios';
import type { GradingResult } from '@/types/essayRubric';

interface CaseGradingResult {
  total_score: number;
  max_score: number;
  percentage: number;
  questions: (GradingResult & { question_id: string })[];
  overall_feedback: string;
}

interface CaseScenarioResultProps {
  result: CaseGradingResult;
  questions: { id: string; question_text: string }[];
}

function QuestionResultBlock({
  qResult,
  questionText,
  label,
  questionId,
}: {
  qResult: GradingResult;
  questionText: string;
  label: string;
  questionId: string;
}) {
  const [showModel, setShowModel] = useState(false);
  const { data: modelAnswer } = useCaseQuestionModelAnswer(questionId, showModel);

  const scoreColor = qResult.percentage >= 70
    ? 'text-emerald-600'
    : qResult.percentage >= 50
      ? 'text-amber-600'
      : 'text-destructive';

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{label}</h4>
        <span className={cn('font-bold text-sm', scoreColor)}>
          {qResult.score}/{qResult.max_score}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{questionText}</p>

      {qResult.missing_critical_points.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 space-y-0.5">
          <p className="text-xs font-medium text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />Critical Missed
          </p>
          {qResult.missing_critical_points.map((p, i) => (
            <p key={i} className="text-xs text-destructive/80 ml-4">• {p}</p>
          ))}
        </div>
      )}

      {qResult.matched_points.length > 0 && (
        <div className="space-y-0.5">
          {qResult.matched_points.map((p, i) => (
            <p key={i} className="text-xs flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />{p}
            </p>
          ))}
        </div>
      )}

      {qResult.missed_points.length > 0 && (
        <div className="space-y-0.5">
          {qResult.missed_points.map((p, i) => (
            <p key={i} className="text-xs flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive shrink-0" />{p}
            </p>
          ))}
        </div>
      )}

      {qResult.feedback && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-2">
          <p className="text-xs">{qResult.feedback}</p>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => setShowModel(!showModel)} className="gap-1 w-full justify-between text-xs">
        Model Answer
        {showModel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {showModel && (
        <div className="border rounded-md p-2">
          {modelAnswer ? (
            <p className="text-xs whitespace-pre-wrap">{modelAnswer}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No model answer available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CaseScenarioResult({ result, questions }: CaseScenarioResultProps) {
  const scoreColor = result.percentage >= 70
    ? 'text-emerald-600'
    : result.percentage >= 50
      ? 'text-amber-600'
      : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* Total Case Score */}
      <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
        <p className={cn('text-3xl font-bold', scoreColor)}>{result.percentage}%</p>
        <p className="text-sm text-muted-foreground">
          {result.total_score}/{result.max_score} total points
        </p>
      </div>

      {/* Overall Feedback */}
      {result.overall_feedback && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <p className="text-sm">{result.overall_feedback}</p>
        </div>
      )}

      {/* Per-Question Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Per-Question Breakdown</h4>
        {result.questions.map((qr, i) => {
          const q = questions.find(q => q.id === qr.question_id);
          return (
            <QuestionResultBlock
              key={qr.question_id}
              qResult={qr}
              questionText={q?.question_text || ''}
              label={`Part ${String.fromCharCode(65 + i)}`}
              questionId={qr.question_id}
            />
          );
        })}
      </div>
    </div>
  );
}
