import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { GradingResult } from '@/types/essayRubric';

interface ShortEssayResultProps {
  result: GradingResult;
  essayId: string;
}

function useEssayModelAnswer(essayId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['essay-model-answer', essayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('model_answer')
        .eq('id', essayId)
        .single();
      if (error) throw error;
      return data?.model_answer as string | null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function ShortEssayResult({ result, essayId }: ShortEssayResultProps) {
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const { data: modelAnswer } = useEssayModelAnswer(essayId, showModelAnswer);

  const scoreColor = result.percentage >= 70
    ? 'text-emerald-600'
    : result.percentage >= 50
      ? 'text-amber-600'
      : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
        <p className={cn('text-3xl font-bold', scoreColor)}>{result.percentage}%</p>
        <p className="text-sm text-muted-foreground">
          {result.score}/{result.max_score} points covered
        </p>
        {result.confidence_score > 0 && (
          <Badge variant="outline" className="text-xs">
            Confidence: {Math.round(result.confidence_score * 100)}%
          </Badge>
        )}
      </div>

      {/* Critical Missed Points Warning */}
      {result.missing_critical_points.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-1">
          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Critical Points Missed
          </p>
          {result.missing_critical_points.map((point, i) => (
            <p key={i} className="text-sm text-destructive/80 ml-5">• {point}</p>
          ))}
        </div>
      )}

      {/* Covered Points */}
      {result.matched_points.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Covered</p>
          {result.matched_points.map((point, i) => (
            <p key={i} className="text-sm flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              {point}
            </p>
          ))}
        </div>
      )}

      {/* Missed Points */}
      {result.missed_points.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Missed</p>
          {result.missed_points.map((point, i) => (
            <p key={i} className="text-sm flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              {point}
            </p>
          ))}
        </div>
      )}

      {/* AI Feedback */}
      {result.feedback && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <p className="text-sm">{result.feedback}</p>
        </div>
      )}

      {/* Model Answer Accordion */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowModelAnswer(!showModelAnswer)}
          className="gap-2 w-full justify-between"
        >
          <span className="text-xs font-medium">Model Answer</span>
          {showModelAnswer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        {showModelAnswer && (
          <div className="border rounded-md p-3 mt-1">
            {modelAnswer ? (
              <p className="text-sm whitespace-pre-wrap">{modelAnswer}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No model answer available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
