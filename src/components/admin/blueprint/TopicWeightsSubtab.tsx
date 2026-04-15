import { useState, useMemo, useCallback, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useModuleChapters } from '@/hooks/useChapters';
import {
  useAssessmentStructures,
  useAssessmentComponents,
  useTopicExamWeights,
  useAssessmentMutations,
  ASSESSMENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS,
  type ExamComponentType,
  type AssessmentComponent,
  type TopicExamWeight,
} from '@/hooks/useAssessmentBlueprint';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
  selectedYearId: string;
  onYearChange: (v: string) => void;
  selectedModuleId: string;
  onModuleChange: (v: string) => void;
}

export function TopicWeightsSubtab({ years, modules, selectedYearId, onYearChange, selectedModuleId, onModuleChange }: Props) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const filteredModules = selectedYearId ? modules.filter(m => m.year_id === selectedYearId) : modules;
  const { data: structures = [] } = useAssessmentStructures(selectedModuleId || undefined);
  const { data: components = [] } = useAssessmentComponents(selectedAssessmentId || undefined);
  const { data: weights = [], isLoading: weightsLoading } = useTopicExamWeights(selectedAssessmentId || undefined);
  const { data: chapters = [] } = useModuleChapters(selectedModuleId || undefined);

  // Determine weight mode from assessment
  const selectedAssessment = structures.find(s => s.id === selectedAssessmentId);
  const weightMode: 'percent' | 'marks' = (selectedAssessment as any)?.weight_mode ?? 'percent';

  const qc = useQueryClient();

  const upsertCellMutation = useMutation({
    mutationFn: async (input: { assessment_id: string; component_id: string; chapter_id: string; module_id: string; value: number }) => {
      const payload: any = {
        assessment_id: input.assessment_id,
        component_id: input.component_id,
        module_id: input.module_id,
        chapter_id: input.chapter_id,
        topic_id: null,
        notes: null,
      };
      if (weightMode === 'percent') {
        payload.weight_percent = input.value;
        payload.weight_marks = null;
      } else {
        payload.weight_marks = input.value;
        payload.weight_percent = 0;
      }

      // Find existing weight for this cell
      const existing = weights.find(w =>
        w.component_id === input.component_id && w.chapter_id === input.chapter_id
      );

      if (existing) {
        const { error } = await supabase
          .from('topic_exam_weights')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        if (input.value === 0) return; // Don't create zero-weight rows
        const { error } = await supabase
          .from('topic_exam_weights')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-exam-weights', selectedAssessmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Build matrix data
  const matrixData = useMemo(() => {
    return chapters.map(ch => {
      const cellValues: Record<string, number> = {};
      let rowTotal = 0;
      for (const comp of components) {
        const w = weights.find(wt => wt.chapter_id === ch.id && wt.component_id === comp.id);
        const val = w ? (weightMode === 'percent' ? Number(w.weight_percent) : Number(w.weight_marks ?? 0)) : 0;
        cellValues[comp.id] = val;
        rowTotal += val;
      }
      return { chapter: ch, cellValues, rowTotal };
    });
  }, [chapters, components, weights, weightMode]);

  // Column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const comp of components) {
      totals[comp.id] = matrixData.reduce((sum, row) => sum + (row.cellValues[comp.id] || 0), 0);
    }
    return totals;
  }, [matrixData, components]);

  const grandTotal = Object.values(columnTotals).reduce((s, v) => s + v, 0);

  const missingChapters = matrixData.filter(r => r.rowTotal === 0);

  if (!selectedModuleId) {
    return (
      <div className="space-y-4">
        <Filters
          years={years}
          modules={modules}
          filteredModules={filteredModules}
          selectedYearId={selectedYearId}
          selectedModuleId={selectedModuleId}
          selectedAssessmentId={selectedAssessmentId}
          structures={structures}
          onYearChange={v => { onYearChange(v); onModuleChange(''); setSelectedAssessmentId(''); }}
          onModuleChange={v => { onModuleChange(v); setSelectedAssessmentId(''); }}
          onAssessmentChange={setSelectedAssessmentId}
        />
        <p className="text-sm text-muted-foreground py-8 text-center">Select a module and assessment to manage weights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Filters
        years={years}
        modules={modules}
        filteredModules={filteredModules}
        selectedYearId={selectedYearId}
        selectedModuleId={selectedModuleId}
        selectedAssessmentId={selectedAssessmentId}
        structures={structures}
          onYearChange={v => { onYearChange(v); onModuleChange(''); setSelectedAssessmentId(''); }}
          onModuleChange={v => { onModuleChange(v); setSelectedAssessmentId(''); }}
        onAssessmentChange={setSelectedAssessmentId}
      />

      {!selectedAssessmentId && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {structures.length === 0 ? 'No assessments defined. Create one in the Exam Structure tab first.' : 'Select an assessment.'}
        </p>
      )}

      {selectedAssessmentId && weightsLoading && (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
      )}

      {selectedAssessmentId && !weightsLoading && components.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No components defined for this assessment. Add components in the Exam Structure tab.</p>
      )}

      {selectedAssessmentId && !weightsLoading && components.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              Mode: {weightMode === 'percent' ? 'Percentage' : 'Marks'}
            </Badge>
            {weightMode === 'percent' && (
              <span>Each column should total 100%</span>
            )}
            {weightMode === 'marks' && (
              <span>Column totals should match component marks</span>
            )}
          </div>

          <ScrollArea className="w-full">
            <div className="min-w-[600px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[180px]">Chapter</th>
                    {components.map(comp => (
                      <th key={comp.id} className="text-center py-2 px-1 font-medium text-muted-foreground min-w-[80px]">
                        <div>{COMPONENT_TYPE_LABELS[comp.component_type as ExamComponentType]}</div>
                        {weightMode === 'marks' && (
                          <div className="text-[10px] font-normal">({comp.total_marks}m)</div>
                        )}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 font-semibold min-w-[60px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map(row => (
                    <tr key={row.chapter.id} className={`border-b hover:bg-muted/30 ${row.rowTotal === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                      <td className="py-1.5 px-2 font-medium truncate max-w-[200px]">{row.chapter.title}</td>
                      {components.map(comp => (
                        <td key={comp.id} className="py-1 px-1 text-center">
                          <CellInput
                            value={row.cellValues[comp.id] || 0}
                            onCommit={(val) => {
                              upsertCellMutation.mutate({
                                assessment_id: selectedAssessmentId,
                                component_id: comp.id,
                                chapter_id: row.chapter.id,
                                module_id: selectedModuleId,
                                value: val,
                              });
                            }}
                          />
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center font-semibold tabular-nums">
                        {row.rowTotal > 0 ? (weightMode === 'percent' ? `${row.rowTotal.toFixed(1)}%` : row.rowTotal) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 px-2">Column Total</td>
                    {components.map(comp => {
                      const total = columnTotals[comp.id] || 0;
                      const expected = weightMode === 'percent' ? 100 : Number(comp.total_marks);
                      const isOff = Math.abs(total - expected) > 0.5;
                      return (
                        <td key={comp.id} className={`py-2 px-1 text-center tabular-nums ${isOff ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                          {weightMode === 'percent' ? `${total.toFixed(1)}%` : total}
                          {isOff && <AlertTriangle className="w-3 h-3 inline ml-0.5" />}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center tabular-nums">
                      {weightMode === 'percent' ? `${grandTotal.toFixed(1)}%` : grandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {missingChapters.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 rounded-md p-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{missingChapters.length} chapter(s) have no weight: {missingChapters.map(m => m.chapter.title).join(', ')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Cell Input ────────────────────────────────────────────────

function CellInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [localVal, setLocalVal] = useState(String(value || ''));
  const prevValue = useRef(value);

  // Sync from parent when data refreshes
  if (value !== prevValue.current) {
    prevValue.current = value;
    setLocalVal(String(value || ''));
  }

  return (
    <Input
      type="number"
      className="w-16 h-7 text-xs text-center p-1 tabular-nums mx-auto"
      min={0}
      step={0.5}
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(localVal) || 0;
        if (parsed !== value) {
          onCommit(parsed);
        }
      }}
    />
  );
}

// ─── Filters ───────────────────────────────────────────────────

function Filters({ years, filteredModules, selectedYearId, selectedModuleId, selectedAssessmentId, structures, onYearChange, onModuleChange, onAssessmentChange }: {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
  filteredModules: { id: string; name: string; year_id: string }[];
  selectedYearId: string;
  selectedModuleId: string;
  selectedAssessmentId: string;
  structures: any[];
  onYearChange: (v: string) => void;
  onModuleChange: (v: string) => void;
  onAssessmentChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-3 flex-wrap">
      <div className="w-48">
        <Label className="text-xs">Year</Label>
        <Select value={selectedYearId} onValueChange={onYearChange}>
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
      {structures.length > 0 && (
        <div className="w-64">
          <Label className="text-xs">Assessment</Label>
          <Select value={selectedAssessmentId} onValueChange={onAssessmentChange}>
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
  );
}
