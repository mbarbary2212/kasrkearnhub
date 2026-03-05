import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { MonitoringSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function MonitoringSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<MonitoringSectionData>) {
  const [answer, setAnswer] = useState(
    (previousAnswer?.answer as string) || ''
  );

  const handleSubmit = () => {
    onSubmit({ answer: answer.trim() });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="font-medium">{data.question}</Label>
        {data.rubric?.expected_points && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Consider addressing:</p>
            <div className="flex flex-wrap gap-1.5">
              {data.rubric.expected_points.slice(0, 3).map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs">{p.length > 40 ? p.slice(0, 40) + '…' : p}</Badge>
              ))}
              {data.rubric.expected_points.length > 3 && (
                <Badge variant="outline" className="text-xs">+{data.rubric.expected_points.length - 3} more</Badge>
              )}
            </div>
          </div>
        )}
        <Textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={6}
          className="mt-2"
          disabled={readOnly}
          placeholder="Describe your monitoring and follow-up plan..."
        />
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !answer.trim()} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit
        </Button>
      )}
    </div>
  );
}
