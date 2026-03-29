import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  useAssessments,
  useAssessmentComponents,
  useCreateAssessment,
  useDeleteAssessment,
  useAddComponent,
  useUpdateComponent,
  useDeleteComponent,
} from '@/hooks/useAssessmentBlueprint';

const COMPONENT_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'short_answer_recall', label: 'Short Answer (Recall)' },
  { value: 'short_answer_case', label: 'Short Answer (Case)' },
  { value: 'osce', label: 'OSCE' },
  { value: 'long_case', label: 'Long Case' },
  { value: 'short_case', label: 'Short Case' },
  { value: 'paraclinical', label: 'Paraclinical' },
];

const ASSESSMENT_TYPES = [
  { value: 'final_written', label: 'Final Written' },
  { value: 'final_practical', label: 'Final Practical' },
  { value: 'formative', label: 'Formative' },
  { value: 'module_exam', label: 'Module Exam' },
];

function ComponentLabel(type: string) {
  return COMPONENT_TYPES.find(c => c.value === type)?.label || type;
}

function AssessmentTypeLabel(type: string) {
  return ASSESSMENT_TYPES.find(a => a.value === type)?.label || type;
}

interface Props {
  moduleId: string;
  yearId: string;
  canManage: boolean;
}

export function ExamStructureTab({ moduleId, yearId, canManage }: Props) {
  const { data: assessments, isLoading } = useAssessments(moduleId, yearId);
  const createAssessment = useCreateAssessment();
  const deleteAssessment = useDeleteAssessment();

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('final_written');
  const [newMarks, setNewMarks] = useState(100);
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const handleCreate = () => {
    if (!newName.trim()) return;
    createAssessment.mutate({
      module_id: moduleId,
      year_id: yearId,
      name: newName.trim(),
      assessment_type: newType,
      total_marks: newMarks,
      weight_mode: 'marks',
    }, {
      onSuccess: () => {
        setNewName('');
        setShowAdd(false);
      },
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assessments</h3>
        {canManage && (
          <Button onClick={() => setShowAdd(!showAdd)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Assessment
          </Button>
        )}
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Paper 1" className="w-[200px]" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Type</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Total Marks</label>
                <Input type="number" value={newMarks} onChange={e => setNewMarks(Number(e.target.value))} className="w-[120px]" />
              </div>
              <Button onClick={handleCreate} disabled={createAssessment.isPending}>
                {createAssessment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(!assessments || assessments.length === 0) && (
        <p className="text-muted-foreground text-sm py-4">No assessments defined for this module yet.</p>
      )}

      {assessments?.map(assessment => (
        <AssessmentCard
          key={assessment.id}
          assessment={assessment}
          canManage={canManage}
          onDelete={() => deleteAssessment.mutate(assessment.id)}
        />
      ))}
    </div>
  );
}

function AssessmentCard({ assessment, canManage, onDelete }: {
  assessment: any;
  canManage: boolean;
  onDelete: () => void;
}) {
  const { data: components } = useAssessmentComponents(assessment.id);
  const addComponent = useAddComponent();
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();

  const [newCompType, setNewCompType] = useState('mcq');

  const handleAddComponent = () => {
    addComponent.mutate({
      assessment_id: assessment.id,
      component_type: newCompType,
      question_count: 10,
      marks_per_question: 1,
      display_order: (components?.length ?? 0),
    });
  };

  const handleFieldChange = (compId: string, field: 'question_count' | 'marks_per_question', value: number) => {
    updateComponent.mutate({ id: compId, [field]: value });
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold">{assessment.name}</span>
            <Badge variant="secondary">{AssessmentTypeLabel(assessment.assessment_type)}</Badge>
            <span className="text-sm text-muted-foreground">{assessment.total_marks} marks</span>
          </div>
          {canManage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{assessment.name}" and all its components.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {components && components.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Components</p>
            {components.map(comp => (
              <div key={comp.id} className="flex items-center gap-4 bg-muted/30 rounded-lg px-3 py-2">
                <Badge variant="outline" className="min-w-[160px] justify-center">{ComponentLabel(comp.component_type)}</Badge>
                <span className="text-sm text-muted-foreground">Qty</span>
                <Input
                  type="number"
                  className="w-[80px]"
                  value={comp.question_count}
                  onChange={e => handleFieldChange(comp.id, 'question_count', Number(e.target.value))}
                  disabled={!canManage}
                  min={0}
                />
                <span className="text-sm text-muted-foreground">Marks each</span>
                <Input
                  type="number"
                  className="w-[80px]"
                  value={comp.marks_per_question}
                  onChange={e => handleFieldChange(comp.id, 'marks_per_question', Number(e.target.value))}
                  disabled={!canManage}
                  min={0}
                  step={0.5}
                />
                <span className="text-sm text-muted-foreground ml-auto">= {(comp.question_count * comp.marks_per_question).toFixed(0)} marks</span>
                {canManage && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteComponent.mutate(comp.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <div className="flex items-center gap-2 pt-1">
            <Select value={newCompType} onValueChange={setNewCompType}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPONENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleAddComponent} disabled={addComponent.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
