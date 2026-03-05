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
  const tasks = data.tasks || [];
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>(
    (previousAnswer?.task_answers as Record<string, string>) || {}
  );

  const allAnswered = tasks.every(t => taskAnswers[t.id]?.trim());

  const handleSubmit = () => {
    onSubmit({ task_answers: taskAnswers });
  };

  const taskTypeLabel = (type: string) => {
    switch (type) {
      case 'ward_round_presentation': return 'Ward Round';
      case 'key_decision': return 'Key Decision';
      case 'learning_point': return 'Reflection';
      default: return type;
    }
  };

  return (
    <div className="space-y-5">
      {tasks.map((task, i) => (
        <div key={task.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{taskTypeLabel(task.type)}</Badge>
            <Label className="font-medium text-sm">{task.label}</Label>
            <span className="text-xs text-muted-foreground ml-auto">({task.rubric.points} pts)</span>
          </div>
          <p className="text-sm text-muted-foreground">{task.instruction}</p>
          <Textarea
            value={taskAnswers[task.id] || ''}
            onChange={e => setTaskAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
            rows={task.type === 'ward_round_presentation' ? 8 : 5}
            disabled={readOnly}
            placeholder={`Write your ${taskTypeLabel(task.type).toLowerCase()} here...`}
          />
        </div>
      ))}

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !allAnswered} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Conclusion
        </Button>
      )}
    </div>
  );
}
