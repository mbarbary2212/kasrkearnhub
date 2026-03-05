import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorySectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function HistoryTakingSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<HistorySectionData>) {
  const [showHandover, setShowHandover] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>(
    (previousAnswer?.comprehension_answers as Record<string, string>) || {}
  );

  const handover = data.atmist_handover;
  const questions = data.comprehension_questions || [];

  const allAnswered = questions.every(q => answers[q.id]?.trim());

  const handleSubmit = () => {
    onSubmit({
      comprehension_answers: answers,
      questions_answered: Object.keys(answers).filter(k => answers[k]?.trim()).length,
      total_questions: questions.length,
    });
  };

  return (
    <div className="space-y-5">
      {/* ATMIST Handover */}
      {handover && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">Paramedic Handover (ATMIST)</Label>
            <Badge variant="outline" className="text-xs ml-auto cursor-pointer" onClick={() => setShowHandover(!showHandover)}>
              {showHandover ? 'Collapse' : 'Expand'}
            </Badge>
          </div>
          {showHandover && (
            <Card className="bg-muted/30">
              <CardContent className="py-3 px-4 space-y-2 text-sm">
                {[
                  { key: 'A — Age/Time', value: handover.age_time },
                  { key: 'M — Mechanism', value: handover.mechanism },
                  { key: 'I — Injuries', value: handover.injuries },
                  { key: 'S — Signs', value: handover.signs },
                  { key: 'T — Treatment', value: handover.treatment },
                ].map(item => (
                  <div key={item.key}>
                    <span className="font-semibold text-primary">{item.key}:</span>{' '}
                    <span className="text-foreground">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Checklist (read-only reference) */}
      {data.checklist && data.checklist.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">History Checklist Reference</Label>
          <div className="mt-1 space-y-2">
            {data.checklist.map(cat => (
              <div key={cat.key} className="border rounded p-2">
                <p className="text-sm font-medium mb-1">{cat.label}</p>
                <div className="space-y-0.5">
                  {cat.items.map(item => (
                    <div key={item.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehension Questions */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <Label className="font-medium">Comprehension Questions</Label>
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-1">
              <Label className="text-sm">
                Q{i + 1}: {q.question}
                <span className="text-xs text-muted-foreground ml-2">({q.points} pts)</span>
              </Label>
              <Input
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                disabled={readOnly}
                placeholder="Type your answer..."
                className="text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !allAnswered} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit History Taking
        </Button>
      )}
    </div>
  );
}
