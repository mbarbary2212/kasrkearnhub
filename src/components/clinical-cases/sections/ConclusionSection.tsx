import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ConclusionSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function ConclusionSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<ConclusionSectionData>) {
  const [answer, setAnswer] = useState(
    (previousAnswer?.answer as string) || ''
  );

  const handleSubmit = () => {
    onSubmit({ answer: answer.trim() });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="font-medium">{data.ward_round_prompt}</Label>
        {data.key_decisions?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Key decisions to address:</p>
            <div className="flex flex-wrap gap-1.5">
              {data.key_decisions.map((d, i) => (
                <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={6}
        disabled={readOnly}
        placeholder="Present your summary and key decisions to the consultant..."
      />

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !answer.trim()} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Conclusion
        </Button>
      )}
    </div>
  );
}
