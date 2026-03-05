import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosisSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function DiagnosisSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<DiagnosisSectionData>) {
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(
    (previousAnswer?.primary_diagnosis as string) || ''
  );
  const [differentials, setDifferentials] = useState<string[]>(
    (previousAnswer?.differentials as string[]) || ['', '', '']
  );

  const updateDifferential = (index: number, value: string) => {
    const next = [...differentials];
    next[index] = value;
    setDifferentials(next);
  };

  const handleSubmit = () => {
    onSubmit({
      primary_diagnosis: primaryDiagnosis.trim(),
      differentials: differentials.filter(d => d.trim()),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Brain className="w-5 h-5" />
        <p className="text-sm">Based on the history, examination, and investigations, provide your diagnosis.</p>
      </div>

      <div>
        <Label className="font-medium">Primary Diagnosis *</Label>
        <Input
          value={primaryDiagnosis}
          onChange={e => setPrimaryDiagnosis(e.target.value)}
          placeholder="Enter your primary diagnosis"
          className="mt-1"
          disabled={readOnly}
        />
      </div>

      <div>
        <Label className="font-medium">Differential Diagnoses</Label>
        <p className="text-xs text-muted-foreground mb-2">List up to 3 alternative diagnoses</p>
        <div className="space-y-2">
          {differentials.map((d, i) => (
            <Input
              key={i}
              value={d}
              onChange={e => updateDifferential(i, e.target.value)}
              placeholder={`Differential ${i + 1}`}
              disabled={readOnly}
            />
          ))}
        </div>
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !primaryDiagnosis.trim()} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Diagnosis
        </Button>
      )}
    </div>
  );
}
