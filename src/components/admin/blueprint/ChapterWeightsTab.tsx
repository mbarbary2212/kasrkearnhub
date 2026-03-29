import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAssessments,
  useAssessmentComponents,
  useModuleChapters,
  useChapterWeights,
  useUpsertChapterWeight,
} from '@/hooks/useAssessmentBlueprint';

const COMPONENT_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  short_answer_recall: 'Short Answer (Recall)',
  short_answer_case: 'Short Answer (Case)',
  osce: 'OSCE',
  long_case: 'Long Case',
  short_case: 'Short Case',
  paraclinical: 'Paraclinical',
};

// Cross-module source module IDs
const CROSS_MODULE_SOURCE = '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10';

interface Props {
  moduleId: string;
  canManage: boolean;
}

export function ChapterWeightsTab({ moduleId, canManage }: Props) {
  // We need to get assessments without yearId filter — derive from first assessment
  // Instead, get all for this module across all years
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(moduleId);

  // Get assessments for this module (need yearId, but we work around by getting all)
  const { data: allAssessments, isLoading: assessmentsLoading } = useAssessments(moduleId, '');

  // Provide a year-agnostic query — override the hook
  // Actually the hook requires yearId. Let's use a local state for selected assessment.

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const { data: components } = useAssessmentComponents(selectedAssessmentId || undefined);
  const { data: weights } = useChapterWeights(selectedAssessmentId || undefined);
  const upsertWeight = useUpsertChapterWeight();

  // Group chapters by source
  const ownChapters = chapters?.filter(c => c.module_id === moduleId) ?? [];
  const crossChapters = chapters?.filter(c => c.module_id === CROSS_MODULE_SOURCE) ?? [];
  const allChapters = [...ownChapters, ...crossChapters];

  const selectedAssessment = allAssessments?.find(a => a.id === selectedAssessmentId);

  const getWeight = useCallback((componentId: string, chapterId: string) => {
    return weights?.find(w => w.component_id === componentId && w.chapter_id === chapterId)?.weight ?? '';
  }, [weights]);

  const handleWeightChange = (componentId: string, chapterId: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    upsertWeight.mutate({
      assessment_id: selectedAssessmentId,
      component_id: componentId,
      chapter_id: chapterId,
      weight: numVal,
    });
  };

  if (chaptersLoading || assessmentsLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium block mb-1">Assessment</label>
          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select an assessment" /></SelectTrigger>
            <SelectContent>
              {allAssessments?.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name} ({COMPONENT_LABELS[a.assessment_type] || a.assessment_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedAssessment && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Mode: {selectedAssessment.weight_mode === 'marks' ? 'Marks' : 'Percent'}</Badge>
          <span className="text-sm text-muted-foreground">Column totals should match component marks</span>
        </div>
      )}

      {selectedAssessmentId && components && components.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Chapter</TableHead>
                {components.map(comp => (
                  <TableHead key={comp.id} className="text-center min-w-[120px]">
                    {COMPONENT_LABELS[comp.component_type] || comp.component_type}
                    <div className="text-xs text-muted-foreground">({(comp.question_count * comp.marks_per_question).toFixed(0)}m)</div>
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={components.length + 2} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    From SUR-423 (General Surgery Book)
                  </TableCell>
                </TableRow>
              )}
              {crossChapters.map(chapter => (
                <ChapterWeightRow
                  key={chapter.id}
                  chapter={chapter}
                  components={components}
                  getWeight={getWeight}
                  onWeightChange={handleWeightChange}
                  canManage={canManage}
                />
              ))}
              {crossChapters.length > 0 && ownChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={components.length + 2} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    SUR-523 Chapters
                  </TableCell>
                </TableRow>
              )}
              {ownChapters.map(chapter => (
                <ChapterWeightRow
                  key={chapter.id}
                  chapter={chapter}
                  components={components}
                  getWeight={getWeight}
                  onWeightChange={handleWeightChange}
                  canManage={canManage}
                />
              ))}
              {/* Column totals row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Total</TableCell>
                {components.map(comp => {
                  const colTotal = allChapters.reduce((sum, ch) => {
                    const w = weights?.find(wt => wt.component_id === comp.id && wt.chapter_id === ch.id);
                    return sum + (w?.weight ?? 0);
                  }, 0);
                  const expected = comp.question_count * comp.marks_per_question;
                  const isMatch = Math.abs(colTotal - expected) < 0.01;
                  return (
                    <TableCell key={comp.id} className={`text-center ${isMatch ? 'text-green-500' : colTotal > 0 ? 'text-destructive' : ''}`}>
                      {colTotal > 0 ? colTotal.toFixed(1) : '—'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {allChapters.reduce((total, ch) => {
                    return total + components.reduce((sum, comp) => {
                      const w = weights?.find(wt => wt.component_id === comp.id && wt.chapter_id === ch.id);
                      return sum + (w?.weight ?? 0);
                    }, 0);
                  }, 0).toFixed(1)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {selectedAssessmentId && (!components || components.length === 0) && (
        <p className="text-muted-foreground text-sm py-4">No components defined for this assessment. Add components in the Exam Structure tab first.</p>
      )}

      {!selectedAssessmentId && (
        <p className="text-muted-foreground text-sm py-4">Select an assessment above to manage chapter weight allocations.</p>
      )}
    </div>
  );
}

function ChapterWeightRow({ chapter, components, getWeight, onWeightChange, canManage }: {
  chapter: { id: string; title: string; module_id: string; book_label: string };
  components: any[];
  getWeight: (componentId: string, chapterId: string) => number | '';
  onWeightChange: (componentId: string, chapterId: string, value: string) => void;
  canManage: boolean;
}) {
  const rowTotal = components.reduce((sum, comp) => {
    const w = getWeight(comp.id, chapter.id);
    return sum + (typeof w === 'number' ? w : 0);
  }, 0);

  return (
    <TableRow>
      <TableCell className="font-medium">{chapter.title}</TableCell>
      {components.map(comp => (
        <TableCell key={comp.id} className="text-center">
          <Input
            type="number"
            className="w-[70px] mx-auto text-center"
            value={getWeight(comp.id, chapter.id)}
            onChange={e => onWeightChange(comp.id, chapter.id, e.target.value)}
            disabled={!canManage}
            min={0}
            step={0.5}
          />
        </TableCell>
      ))}
      <TableCell className="text-center font-medium">
        {rowTotal > 0 ? rowTotal.toFixed(1) : '—'}
      </TableCell>
    </TableRow>
  );
}
