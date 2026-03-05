import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManagementSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function ManagementSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<ManagementSectionData>) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>(
    (previousAnswer?.mcq_answers as Record<string, string>) || {}
  );
  const [freeTextAnswers, setFreeTextAnswers] = useState<Record<string, string>>(
    (previousAnswer?.free_text_answers as Record<string, string>) || {}
  );

  const questions = data.questions || [];
  const mcqs = questions.filter(q => q.type === 'mcq');
  const freeTexts = questions.filter(q => q.type === 'free_text');

  const selectOption = (qId: string, letter: string) => {
    if (readOnly) return;
    setMcqAnswers(prev => ({ ...prev, [qId]: letter }));
  };

  // Parse option string like "A. Some text" into { key: "A", text: "Some text" }
  const parseOption = (opt: string) => {
    const match = opt.match(/^([A-Z])\.\s*(.+)$/);
    return match ? { key: match[1], text: match[2] } : { key: opt[0], text: opt };
  };

  const allMcqsAnswered = mcqs.every(q => mcqAnswers[q.id]);
  const allFreeTextsAnswered = freeTexts.every(q => freeTextAnswers[q.id]?.trim());

  const handleSubmit = () => {
    onSubmit({
      mcq_answers: mcqAnswers,
      free_text_answers: freeTextAnswers,
    });
  };

  return (
    <div className="space-y-6">
      {/* MCQs */}
      {mcqs.map((q, qi) => (
        <div key={q.id} className="space-y-2">
          <Label className="font-medium text-sm">
            Q{qi + 1}: {q.question}
            <span className="text-xs text-muted-foreground ml-2">({q.points} pts)</span>
          </Label>
          <div className="space-y-1.5">
            {(q.options || []).map(optStr => {
              const opt = parseOption(optStr);
              const selected = mcqAnswers[q.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectOption(q.id, opt.key)}
                  disabled={readOnly}
                  className={cn(
                    'w-full text-left flex items-center gap-2 p-2.5 rounded-lg border transition-all text-sm',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/50',
                    readOnly && 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono shrink-0',
                      selected ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30'
                    )}
                  >
                    {selected ? <Check className="w-3 h-3" /> : opt.key}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Free text questions */}
      {freeTexts.map((q, fi) => (
        <div key={q.id} className="space-y-1">
          <Label className="font-medium text-sm">
            {q.question}
            <span className="text-xs text-muted-foreground ml-2">({q.rubric?.points || q.points} pts)</span>
          </Label>
          <Textarea
            value={freeTextAnswers[q.id] || ''}
            onChange={e => setFreeTextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            rows={5}
            disabled={readOnly}
            placeholder="Type your answer..."
          />
        </div>
      ))}

      {!readOnly && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !allMcqsAnswered || !allFreeTextsAnswered}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit
        </Button>
      )}
    </div>
  );
}
