import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClinicalCaseWorkedContent } from '@/hooks/useStudyResources';

interface WorkedCaseFormProps {
  content: ClinicalCaseWorkedContent;
  onChange: (c: ClinicalCaseWorkedContent) => void;
}

export function WorkedCaseForm({ content, onChange }: WorkedCaseFormProps) {
  // Differential Diagnosis handlers
  const addDifferential = () => {
    onChange({
      ...content,
      differential_diagnosis: [...content.differential_diagnosis, ''],
    });
  };

  const removeDifferential = (index: number) => {
    if (content.differential_diagnosis.length <= 1) return;
    onChange({
      ...content,
      differential_diagnosis: content.differential_diagnosis.filter((_, i) => i !== index),
    });
  };

  const updateDifferential = (index: number, value: string) => {
    const updated = [...content.differential_diagnosis];
    updated[index] = value;
    onChange({ ...content, differential_diagnosis: updated });
  };

  // Investigation handlers
  const addInvestigation = () => {
    onChange({
      ...content,
      investigations: [...content.investigations, { test: '', justification: '' }],
    });
  };

  const removeInvestigation = (index: number) => {
    if (content.investigations.length <= 1) return;
    onChange({
      ...content,
      investigations: content.investigations.filter((_, i) => i !== index),
    });
  };

  const updateInvestigation = (index: number, field: 'test' | 'justification', value: string) => {
    const updated = [...content.investigations];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, investigations: updated });
  };

  // Key Learning Points handlers
  const addLearningPoint = () => {
    onChange({
      ...content,
      key_learning_points: [...content.key_learning_points, ''],
    });
  };

  const removeLearningPoint = (index: number) => {
    if (content.key_learning_points.length <= 1) return;
    onChange({
      ...content,
      key_learning_points: content.key_learning_points.filter((_, i) => i !== index),
    });
  };

  const updateLearningPoint = (index: number, value: string) => {
    const updated = [...content.key_learning_points];
    updated[index] = value;
    onChange({ ...content, key_learning_points: updated });
  };

  return (
    <div className="space-y-6">
      {/* 1. History */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">1. History</Label>
        <Textarea
          value={content.history}
          onChange={(e) => onChange({ ...content, history: e.target.value })}
          placeholder="Present the patient's history..."
          rows={4}
        />
      </div>

      {/* 2. Clinical Examination */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">2. Clinical Examination</Label>
        <Textarea
          value={content.clinical_examination}
          onChange={(e) => onChange({ ...content, clinical_examination: e.target.value })}
          placeholder="Describe examination findings..."
          rows={4}
        />
      </div>

      {/* 3. Provisional Diagnosis */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">3. Provisional Diagnosis</Label>
        <Input
          value={content.provisional_diagnosis}
          onChange={(e) => onChange({ ...content, provisional_diagnosis: e.target.value })}
          placeholder="Most likely diagnosis based on initial assessment"
        />
      </div>

      {/* 4. Differential Diagnosis (Ranked) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">4. Differential Diagnosis (Ranked)</Label>
        <div className="space-y-2">
          {content.differential_diagnosis.map((dx, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
              <Input
                value={dx}
                onChange={(e) => updateDifferential(index, e.target.value)}
                placeholder={`Differential ${index + 1}`}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeDifferential(index)}
                disabled={content.differential_diagnosis.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addDifferential}>
          <Plus className="w-3 h-3 mr-1" />
          Add Differential
        </Button>
      </div>

      {/* 5. Investigations with Justification */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">5. Investigations (with Justification)</Label>
        <div className="space-y-3">
          {content.investigations.map((inv, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  value={inv.test}
                  onChange={(e) => updateInvestigation(index, 'test', e.target.value)}
                  placeholder="Investigation/Test"
                  className="text-sm"
                />
                <Input
                  value={inv.justification}
                  onChange={(e) => updateInvestigation(index, 'justification', e.target.value)}
                  placeholder="Justification for this test"
                  className="text-sm"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="mt-1"
                onClick={() => removeInvestigation(index)}
                disabled={content.investigations.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addInvestigation}>
          <Plus className="w-3 h-3 mr-1" />
          Add Investigation
        </Button>
      </div>

      {/* 6. Final Diagnosis */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">6. Final Diagnosis</Label>
        <Input
          value={content.final_diagnosis}
          onChange={(e) => onChange({ ...content, final_diagnosis: e.target.value })}
          placeholder="Confirmed diagnosis after investigations"
        />
      </div>

      {/* 7. Management Plan */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">7. Management Plan</Label>
        <Textarea
          value={content.management_plan}
          onChange={(e) => onChange({ ...content, management_plan: e.target.value })}
          placeholder="Detailed management approach..."
          rows={4}
        />
      </div>

      {/* 8. Key Learning Points / Exam Pearls */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">8. Key Learning Points / Exam Pearls</Label>
        <div className="space-y-2">
          {content.key_learning_points.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-primary">•</span>
              <Input
                value={point}
                onChange={(e) => updateLearningPoint(index, e.target.value)}
                placeholder="Key takeaway or exam pearl"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeLearningPoint(index)}
                disabled={content.key_learning_points.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addLearningPoint}>
          <Plus className="w-3 h-3 mr-1" />
          Add Learning Point
        </Button>
      </div>
    </div>
  );
}
