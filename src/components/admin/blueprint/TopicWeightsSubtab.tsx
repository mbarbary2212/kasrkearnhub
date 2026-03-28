import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useModuleChapters } from '@/hooks/useChapters';
import {
  useAssessmentStructures,
  useAssessmentComponents,
  useTopicExamWeights,
  useAssessmentMutations,
  ASSESSMENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS,
  type ExamComponentType,
} from '@/hooks/useAssessmentBlueprint';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
}

export function TopicWeightsSubtab({ years, modules }: Props) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const filteredModules = selectedYearId ? modules.filter(m => m.year_id === selectedYearId) : modules;
  const { data: structures = [] } = useAssessmentStructures(selectedModuleId || undefined);
  const { data: components = [] } = useAssessmentComponents(selectedAssessmentId || undefined);
  const { data: weights = [], isLoading: weightsLoading } = useTopicExamWeights(selectedAssessmentId || undefined);
  const { data: chapters = [] } = useModuleChapters(selectedModuleId || undefined);
  const { upsertWeight, deleteWeight } = useAssessmentMutations();

  const handleAddWeight = (chapterId: string) => {
    upsertWeight.mutate({
      assessment_id: selectedAssessmentId,
      component_id: null,
      module_id: selectedModuleId,
      chapter_id: chapterId,
      topic_id: null,
      weight_percent: 0,
      weight_marks: null,
      notes: null,
    });
  };

  const chaptersWithWeights = chapters.map(ch => ({
    ...ch,
    weights: weights.filter(w => w.chapter_id === ch.id),
  }));

  const chaptersWithoutWeights = chapters.filter(ch => !weights.some(w => w.chapter_id === ch.id));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Label className="text-xs">Year</Label>
          <Select value={selectedYearId} onValueChange={v => { setSelectedYearId(v); setSelectedModuleId(''); setSelectedAssessmentId(''); }}>
            <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Label className="text-xs">Module</Label>
          <Select value={selectedModuleId} onValueChange={v => { setSelectedModuleId(v); setSelectedAssessmentId(''); }}>
            <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {filteredModules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {structures.length > 0 && (
          <div className="w-64">
            <Label className="text-xs">Assessment</Label>
            <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
              <SelectTrigger><SelectValue placeholder="Select assessment" /></SelectTrigger>
              <SelectContent>
                {structures.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({ASSESSMENT_TYPE_LABELS[s.assessment_type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!selectedAssessmentId && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {!selectedModuleId ? 'Select a module and assessment to manage weights.' : 
           structures.length === 0 ? 'No assessments defined. Create one in the Exam Structure tab first.' :
           'Select an assessment.'}
        </p>
      )}

      {selectedAssessmentId && (
        <>
          {weightsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {/* Existing weights by chapter */}
              {chaptersWithWeights.filter(ch => ch.weights.length > 0).map(ch => (
                <div key={ch.id} className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium">{ch.title}</h4>
                  {ch.weights.map(w => (
                    <div key={w.id} className="flex items-center gap-2 pl-4">
                      <div className="w-44">
                        <Select
                          value={w.component_id || 'overall'}
                          onValueChange={v => upsertWeight.mutate({ ...w, component_id: v === 'overall' ? null : v })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overall">Overall</SelectItem>
                            {components.map(c => (
                              <SelectItem key={c.id} value={c.id}>{COMPONENT_TYPE_LABELS[c.component_type as ExamComponentType]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" className="w-20 h-7 text-xs" min={0} max={100} step={0.5}
                          defaultValue={w.weight_percent}
                          onBlur={e => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== w.weight_percent) upsertWeight.mutate({ ...w, weight_percent: val });
                          }}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" className="w-20 h-7 text-xs" min={0} step={0.5}
                          defaultValue={w.weight_marks ?? ''}
                          placeholder="—"
                          onBlur={e => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            if (val !== w.weight_marks) upsertWeight.mutate({ ...w, weight_marks: val });
                          }}
                        />
                        <span className="text-xs text-muted-foreground">marks</span>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive ml-auto"
                        onClick={() => deleteWeight.mutate({ id: w.id, assessmentId: selectedAssessmentId })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {/* Add another weight row for same chapter */}
                  <Button
                    variant="ghost" size="sm" className="h-6 text-xs ml-4"
                    onClick={() => handleAddWeight(ch.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add component weight
                  </Button>
                </div>
              ))}

              {/* Add weights for chapters without any */}
              {chaptersWithoutWeights.length > 0 && (
                <div className="border border-dashed rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unweighted Chapters</h4>
                  <div className="flex flex-wrap gap-2">
                    {chaptersWithoutWeights.map(ch => (
                      <Button
                        key={ch.id} variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => handleAddWeight(ch.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> {ch.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
