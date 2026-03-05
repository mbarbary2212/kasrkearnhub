import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManagementSectionData, McqQuestion } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function ManagementSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<ManagementSectionData>) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>(
    (previousAnswer?.mcq_answers as Record<number, string>) || {}
  );
  const [freeText, setFreeText] = useState(
    (previousAnswer?.free_text as string) || ''
  );

  const selectOption = (qIndex: number, key: string) => {
    if (readOnly) return;
    setMcqAnswers(prev => ({ ...prev, [qIndex]: key }));
  };

  const allMcqsAnswered = (data.mcqs || []).every((_, i) => mcqAnswers[i]);

  const handleSubmit = () => {
    onSubmit({
      mcq_answers: mcqAnswers,
      free_text: freeText.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* MCQs */}
      {(data.mcqs || []).map((mcq, qi) => (
        <div key={qi} className="space-y-2">
          <Label className="font-medium text-sm">Q{qi + 1}: {mcq.question}</Label>
          <div className="space-y-1.5">
            {mcq.options.map(opt => {
              const selected = mcqAnswers[qi] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectOption(qi, opt.key)}
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

      {/* Free text */}
      {data.free_text_prompt && (
        <div>
          <Label className="font-medium text-sm">{data.free_text_prompt}</Label>
          <Textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            rows={4}
            className="mt-1"
            disabled={readOnly}
            placeholder="Type your answer..."
          />
        </div>
      )}

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !allMcqsAnswered} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit
        </Button>
      )}
    </div>
  );
}
