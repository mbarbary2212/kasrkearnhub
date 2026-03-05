import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
        <Label className="font-medium">{data.prompt}</Label>
        <Textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={5}
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
