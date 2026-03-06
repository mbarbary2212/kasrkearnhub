import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Brain } from 'lucide-react';
import { DiagnosisSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function DiagnosisSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<DiagnosisSectionData>) {
  const [possibleDx, setPossibleDx] = useState(
    (previousAnswer?.possible_diagnosis as string) || ''
  );
  const [differentialDx, setDifferentialDx] = useState(
    (previousAnswer?.differential_diagnosis as string) || ''
  );
  const [finalDx, setFinalDx] = useState(
    (previousAnswer?.final_diagnosis as string) || ''
  );

  const rubric = data.rubric;

  const handleSubmit = () => {
    onSubmit({
      possible_diagnosis: possibleDx.trim(),
      differential_diagnosis: differentialDx.trim(),
      final_diagnosis: finalDx.trim(),
    });
  };

  const isValid = possibleDx.trim() && differentialDx.trim() && finalDx.trim();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Brain className="w-5 h-5" />
        <p className="text-sm">Based on the history, examination, and investigations, provide your diagnosis.</p>
      </div>

      <div>
        <Label className="font-medium">
          {rubric.possible_diagnosis.label}
          <span className="text-xs text-muted-foreground ml-2">({rubric.possible_diagnosis.points} pts)</span>
        </Label>
        <Textarea
          value={possibleDx}
          onChange={e => setPossibleDx(e.target.value)}
          placeholder="List your possible diagnoses... (type 'pass' to skip)"
          className="mt-1"
          rows={3}
          disabled={readOnly}
        />
      </div>

      <div>
        <Label className="font-medium">
          {rubric.differential_diagnosis.label}
          <span className="text-xs text-muted-foreground ml-2">({rubric.differential_diagnosis.points} pts)</span>
        </Label>
        <Textarea
          value={differentialDx}
          onChange={e => setDifferentialDx(e.target.value)}
          placeholder="Rank your differential diagnoses with reasoning..."
          className="mt-1"
          rows={4}
          disabled={readOnly}
        />
      </div>

      <div>
        <Label className="font-medium">
          {rubric.final_diagnosis.label}
          <span className="text-xs text-muted-foreground ml-2">({rubric.final_diagnosis.points} pts)</span>
        </Label>
        <Textarea
          value={finalDx}
          onChange={e => setFinalDx(e.target.value)}
          placeholder="State your final diagnosis..."
          className="mt-1"
          rows={3}
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !isValid} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Diagnosis
        </Button>
      )}
    </div>
  );
}
