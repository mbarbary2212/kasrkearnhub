import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Loader2, BookOpen } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  useAssessments,
  useAssessmentComponents,
  useCreateAssessment,
  useDeleteAssessment,
  useAddComponent,
  useUpdateComponent,
  useDeleteComponent,
  useModuleChapters,
} from '@/hooks/useAssessmentBlueprint';
import { useChapterBlueprintConfigs, EXAM_TYPES, type ChapterBlueprintConfig } from '@/hooks/useChapterBlueprint';

const COMPONENT_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'short_answer_recall', label: 'Short Answer (Recall)' },
  { value: 'short_answer_case', label: 'Short Answer (Case)' },
  { value: 'osce', label: 'OSCE' },
  { value: 'long_case', label: 'Long Case' },
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

function ExamTypeLabel(type: string) {
  return EXAM_TYPES.find(e => e.key === type)?.label || type;
}

const INCLUSION_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  average: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

interface Props {
  moduleId: string;
  yearId: string;
  canManage: boolean;
}

export function ExamStructureTab({ moduleId, yearId, canManage }: Props) {
  const { data: assessments, isLoading } = useAssessments(moduleId, yearId);
  const { data: blueprintConfigs } = useChapterBlueprintConfigs(moduleId);
  const { data: chapters } = useModuleChapters(moduleId);
  const createAssessment = useCreateAssessment();
  const deleteAssessment = useDeleteAssessment();

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('final_written');
  const [newExamType, setNewExamType] = useState('written');
  const [newMarks, setNewMarks] = useState(100);
  const [showAdd, setShowAdd] = useState(false);

  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    chapters?.forEach(ch => map.set(ch.id, ch.title));
    return map;
  }, [chapters]);

  // Group blueprint configs by exam_type -> component_type -> chapters
  const blueprintByExamType = useMemo(() => {
    const map = new Map<string, Map<string, ChapterBlueprintConfig[]>>();
    blueprintConfigs?.forEach(cfg => {
      if (!map.has(cfg.exam_type)) map.set(cfg.exam_type, new Map());
      const compMap = map.get(cfg.exam_type)!;
      if (!compMap.has(cfg.component_type)) compMap.set(cfg.component_type, []);
      compMap.get(cfg.component_type)!.push(cfg);
    });
    return map;
  }, [blueprintConfigs]);

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
      exam_type: newExamType,
    } as any, {
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
                <label className="text-sm font-medium block mb-1">Assessment Type</label>
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
                <label className="text-sm font-medium block mb-1">Exam Type</label>
                <Select value={newExamType} onValueChange={setNewExamType}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
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
          chapterMap={chapterMap}
          blueprintMap={blueprintByExamType.get((assessment as any).exam_type ?? 'written')}
        />
      ))}
    </div>
  );
}

function AssessmentCard({ assessment, canManage, onDelete, chapterMap, blueprintMap }: {
  assessment: any;
  canManage: boolean;
  onDelete: () => void;
  chapterMap: Map<string, string>;
  blueprintMap: Map<string, ChapterBlueprintConfig[]> | undefined;
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

  const totalComponentMarks = components?.reduce((sum, c) => sum + c.question_count * c.marks_per_question, 0) ?? 0;
  const marksMatch = totalComponentMarks === assessment.total_marks;
  const examType = (assessment as any).exam_type ?? 'written';

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold">{assessment.name}</span>
            <Badge variant="secondary">{AssessmentTypeLabel(assessment.assessment_type)}</Badge>
            <Badge variant="outline">{ExamTypeLabel(examType)}</Badge>
            <span className="text-sm text-muted-foreground">{assessment.total_marks} marks</span>
            {components && components.length > 0 && !marksMatch && (
              <Badge variant="destructive" className="text-xs">
                Components = {totalComponentMarks} marks (mismatch)
              </Badge>
            )}
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
            {components.map(comp => {
              const eligibleChapters = blueprintMap?.get(comp.component_type) ?? [];
              return (
                <div key={comp.id} className="space-y-1">
                  <div className="flex items-center gap-4 bg-muted/30 rounded-lg px-3 py-2">
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
                  <ChapterSourceSummary chapters={eligibleChapters} chapterMap={chapterMap} />
                </div>
              );
            })}
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

function ChapterSourceSummary({ chapters, chapterMap }: {
  chapters: ChapterBlueprintConfig[];
  chapterMap: Map<string, string>;
}) {
  if (chapters.length === 0) {
    return (
      <div className="ml-[calc(160px+1rem)] text-xs text-muted-foreground/70 italic pl-3">
        No chapters assigned in Chapter Blueprint
      </div>
    );
  }

  const sorted = [...chapters].sort((a, b) => {
    const order = { high: 0, average: 1, low: 2 };
    return (order[a.inclusion_level] ?? 1) - (order[b.inclusion_level] ?? 1);
  });

  return (
    <Collapsible>
      <CollapsibleTrigger className="ml-[calc(160px+1rem)] flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pl-3 py-0.5">
        <BookOpen className="w-3 h-3" />
        <span>{chapters.length} eligible chapter{chapters.length !== 1 ? 's' : ''} from blueprint</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-[calc(160px+1rem)] pl-3 pt-1 pb-1">
        <div className="flex flex-wrap gap-1.5">
          {sorted.map(cfg => (
            <Badge
              key={cfg.id}
              variant="outline"
              className={`text-[10px] font-normal ${INCLUSION_COLORS[cfg.inclusion_level] || ''}`}
            >
              {chapterMap.get(cfg.chapter_id) ?? 'Unknown'} · {cfg.inclusion_level}
            </Badge>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
