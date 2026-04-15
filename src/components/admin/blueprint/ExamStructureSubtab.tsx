import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  useAssessmentStructures,
  useAssessmentComponents,
  useAssessmentMutations,
  ASSESSMENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS,
  type AssessmentType,
  type ExamComponentType,
  type AssessmentStructure,
} from '@/hooks/useAssessmentBlueprint';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
  selectedYearId: string;
  onYearChange: (v: string) => void;
  selectedModuleId: string;
  onModuleChange: (v: string) => void;
}

export function ExamStructureSubtab({ years, modules, selectedYearId, onYearChange, selectedModuleId, onModuleChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredModules = selectedYearId
    ? modules.filter(m => m.year_id === selectedYearId)
    : modules;

  const { data: structures = [], isLoading } = useAssessmentStructures(selectedModuleId || undefined);
  const { upsertStructure, deleteStructure } = useAssessmentMutations();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Label className="text-xs">Year</Label>
          <Select value={selectedYearId} onValueChange={(v) => { onYearChange(v); onModuleChange(''); }}>
            <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Label className="text-xs">Module</Label>
          <Select value={selectedModuleId} onValueChange={onModuleChange}>
            <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {filteredModules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedModuleId && (
        <p className="text-sm text-muted-foreground py-8 text-center">Select a module to manage its assessments.</p>
      )}

      {selectedModuleId && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Assessments</h3>
            <NewAssessmentButton
              yearId={selectedYearId}
              moduleId={selectedModuleId}
              onSave={(data) => upsertStructure.mutate(data)}
              isSaving={upsertStructure.isPending}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : structures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No assessments defined yet.</p>
          ) : (
            <div className="space-y-3">
              {structures.map(s => (
                <AssessmentCard
                  key={s.id}
                  structure={s}
                  isExpanded={editingId === s.id}
                  onToggle={() => setEditingId(editingId === s.id ? null : s.id)}
                  onDelete={() => deleteStructure.mutate(s.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewAssessmentButton({ yearId, moduleId, onSave, isSaving }: {
  yearId: string; moduleId: string;
  onSave: (data: any) => void; isSaving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    assessment_type: 'final_written' as AssessmentType,
    total_marks: 100,
    duration_minutes: 120,
    notes: '',
    weight_mode: 'percent' as 'percent' | 'marks',
  });

  const handleSave = () => {
    onSave({
      year_id: yearId,
      module_id: moduleId,
      ...form,
      is_active: true,
    });
    setOpen(false);
    setForm({ name: '', assessment_type: 'final_written', total_marks: 100, duration_minutes: 120, notes: '', weight_mode: 'percent' });
  };

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Assessment</Button>;
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Final Written Exam" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.assessment_type} onValueChange={v => setForm(f => ({ ...f, assessment_type: v as AssessmentType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSESSMENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Total Marks</Label>
            <Input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label className="text-xs">Duration (min)</Label>
            <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label className="text-xs">Weight Mode</Label>
            <Select value={form.weight_mode} onValueChange={v => setForm(f => ({ ...f, weight_mode: v as 'percent' | 'marks' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="marks">Marks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.name || isSaving}>
            {isSaving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentCard({ structure, isExpanded, onToggle, onDelete }: {
  structure: AssessmentStructure;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{structure.name}</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {ASSESSMENT_TYPE_LABELS[structure.assessment_type]}
            </Badge>
            <span className="text-xs text-muted-foreground">{structure.total_marks} marks</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => e.stopPropagation()}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
                <AlertDialogDescription>This will also delete all components and weights.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <ComponentsEditor assessmentId={structure.id} />
        </CardContent>
      )}
    </Card>
  );
}

function ComponentsEditor({ assessmentId }: { assessmentId: string }) {
  const { data: components = [], isLoading } = useAssessmentComponents(assessmentId);
  const { upsertComponent, deleteComponent } = useAssessmentMutations();
  const [newType, setNewType] = useState<ExamComponentType>('mcq');

  const existingTypes = new Set(components.map(c => c.component_type));
  const availableTypes = (Object.keys(COMPONENT_TYPE_LABELS) as ExamComponentType[]).filter(t => !existingTypes.has(t));

  const handleAdd = () => {
    upsertComponent.mutate({
      assessment_id: assessmentId,
      component_type: newType,
      question_count: 10,
      marks_per_question: 1,
      display_order: components.length,
    });
  };

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Components</h4>
      {components.length === 0 && <p className="text-xs text-muted-foreground">No components. Add one below.</p>}

      <div className="space-y-2">
        {components.map(comp => (
          <div key={comp.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
            <span className="text-sm font-medium w-40">{COMPONENT_TYPE_LABELS[comp.component_type]}</span>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground">Qty</Label>
              <Input
                type="number" className="w-16 h-7 text-xs" min={0}
                defaultValue={comp.question_count}
                onBlur={e => {
                  const val = parseInt(e.target.value) || 0;
                  if (val !== comp.question_count) {
                    upsertComponent.mutate({ ...comp, question_count: val });
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground">Marks each</Label>
              <Input
                type="number" className="w-16 h-7 text-xs" min={0} step={0.5}
                defaultValue={comp.marks_per_question}
                onBlur={e => {
                  const val = parseFloat(e.target.value) || 0;
                  if (val !== comp.marks_per_question) {
                    upsertComponent.mutate({ ...comp, marks_per_question: val });
                  }
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">= {comp.total_marks} marks</span>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 text-destructive"
              onClick={() => deleteComponent.mutate({ id: comp.id, assessmentId })}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {availableTypes.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="w-52">
            <Select value={newType} onValueChange={v => setNewType(v as ExamComponentType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableTypes.map(t => (
                  <SelectItem key={t} value={t}>{COMPONENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}
