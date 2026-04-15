import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useModuleChapters } from '@/hooks/useChapters';
import {
  useAssessmentStructures,
  useAssessmentComponents,
  useTopicExamWeights,
  ASSESSMENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS,
  type ExamComponentType,
} from '@/hooks/useAssessmentBlueprint';

interface Props {
  years: { id: string; name: string }[];
  modules: { id: string; name: string; year_id: string }[];
  selectedYearId: string;
  onYearChange: (v: string) => void;
  selectedModuleId: string;
  onModuleChange: (v: string) => void;
}

export function ValidationSummarySubtab({ years, modules, selectedYearId, onYearChange, selectedModuleId, onModuleChange }: Props) {

  const filteredModules = selectedYearId ? modules.filter(m => m.year_id === selectedYearId) : modules;
  const { data: structures = [], isLoading } = useAssessmentStructures(selectedModuleId || undefined);
  const { data: chapters = [] } = useModuleChapters(selectedModuleId || undefined);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Label className="text-xs">Year</Label>
          <Select value={selectedYearId} onValueChange={v => { onYearChange(v); onModuleChange(''); }}>
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
        <p className="text-sm text-muted-foreground py-8 text-center">Select a module to view validation summary.</p>
      )}

      {selectedModuleId && isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      )}

      {selectedModuleId && !isLoading && structures.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No assessments defined for this module.</p>
      )}

      {selectedModuleId && !isLoading && structures.map(s => (
        <AssessmentValidationCard
          key={s.id}
          assessmentId={s.id}
          name={s.name}
          type={s.assessment_type}
          declaredTotal={s.total_marks}
          weightMode={(s as any).weight_mode ?? 'percent'}
          chapters={chapters}
        />
      ))}
    </div>
  );
}

function AssessmentValidationCard({ assessmentId, name, type, declaredTotal, weightMode, chapters }: {
  assessmentId: string; name: string; type: string; declaredTotal: number;
  weightMode: 'percent' | 'marks';
  chapters: { id: string; title: string }[];
}) {
  const { data: components = [] } = useAssessmentComponents(assessmentId);
  const { data: weights = [] } = useTopicExamWeights(assessmentId);

  const warnings = useMemo(() => {
    const w: string[] = [];

    // Component marks sum vs declared total
    const componentSum = components.reduce((s, c) => s + Number(c.total_marks), 0);
    if (componentSum !== declaredTotal && components.length > 0) {
      w.push(`Component marks sum to ${componentSum}, but declared total is ${declaredTotal}.`);
    }

    if (weightMode === 'percent') {
      // Per-component: each component's chapter weights should sum to ~100%
      for (const comp of components) {
        const compWeights = weights.filter(wt => wt.component_id === comp.id);
        if (compWeights.length === 0) continue;
        const total = compWeights.reduce((s, wt) => s + Number(wt.weight_percent), 0);
        if (Math.abs(total - 100) > 0.5) {
          w.push(`${COMPONENT_TYPE_LABELS[comp.component_type as ExamComponentType]}: weights sum to ${total.toFixed(1)}%, expected 100%.`);
        }
      }
    } else {
      // Marks mode: per-component chapter weight_marks should sum to component total_marks
      for (const comp of components) {
        const compWeights = weights.filter(wt => wt.component_id === comp.id);
        if (compWeights.length === 0) continue;
        const total = compWeights.reduce((s, wt) => s + Number(wt.weight_marks ?? 0), 0);
        if (Math.abs(total - Number(comp.total_marks)) > 0.5) {
          w.push(`${COMPONENT_TYPE_LABELS[comp.component_type as ExamComponentType]}: marks sum to ${total}, expected ${comp.total_marks}.`);
        }
      }
    }

    // Missing chapters
    const weightedChapterIds = new Set(weights.map(wt => wt.chapter_id).filter(Boolean));
    const missing = chapters.filter(ch => !weightedChapterIds.has(ch.id));
    if (missing.length > 0 && weights.length > 0) {
      w.push(`${missing.length} chapter(s) have no weight: ${missing.map(m => m.title).join(', ')}.`);
    }

    if (components.length === 0) {
      w.push('No components defined.');
    }

    return w;
  }, [components, weights, declaredTotal, chapters, weightMode]);

  const isValid = warnings.length === 0 && components.length > 0;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <CardTitle className="text-sm">{name}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{ASSESSMENT_TYPE_LABELS[type as keyof typeof ASSESSMENT_TYPE_LABELS]}</Badge>
          <Badge variant="outline" className="text-[10px]">{weightMode === 'percent' ? '%' : 'Marks'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground block">Declared Total</span>
            <span className="font-semibold">{declaredTotal}</span>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground block">Component Sum</span>
            <span className="font-semibold">{components.reduce((s, c) => s + Number(c.total_marks), 0)}</span>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground block">Components</span>
            <span className="font-semibold">{components.length}</span>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground block">Weighted Chapters</span>
            <span className="font-semibold">{new Set(weights.map(w => w.chapter_id).filter(Boolean)).size} / {chapters.length}</span>
          </div>
        </div>

        {/* Per-component breakdown */}
        {components.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs">
            {components.map(comp => {
              const compWeights = weights.filter(wt => wt.component_id === comp.id);
              const total = weightMode === 'percent'
                ? compWeights.reduce((s, wt) => s + Number(wt.weight_percent), 0)
                : compWeights.reduce((s, wt) => s + Number(wt.weight_marks ?? 0), 0);
              const expected = weightMode === 'percent' ? 100 : Number(comp.total_marks);
              const isOff = compWeights.length > 0 && Math.abs(total - expected) > 0.5;

              return (
                <div key={comp.id} className={`rounded p-1.5 border ${isOff ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
                  <span className="text-muted-foreground block truncate">{COMPONENT_TYPE_LABELS[comp.component_type as ExamComponentType]}</span>
                  <span className={`font-semibold ${isOff ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {weightMode === 'percent' ? `${total.toFixed(1)}%` : `${total}/${comp.total_marks}m`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        {isValid && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> All validation checks passed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
