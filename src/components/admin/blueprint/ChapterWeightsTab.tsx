import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2 } from 'lucide-react';
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
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(moduleId);
  const { data: allAssessments, isLoading: assessmentsLoading } = useAssessments(moduleId, '');

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const { data: components } = useAssessmentComponents(selectedAssessmentId || undefined);
  const { data: weights } = useChapterWeights(selectedAssessmentId || undefined);
  const upsertWeight = useUpsertChapterWeight();

  // Group chapters by source
  const ownChapters = chapters?.filter(c => c.module_id === moduleId) ?? [];
  const crossChapters = chapters?.filter(c => c.module_id === CROSS_MODULE_SOURCE) ?? [];
  const allChapters = [...ownChapters, ...crossChapters];

  const isEligible = useCallback((componentId: string, chapterId: string) => {
    const w = weights?.find(w => w.component_id === componentId && w.chapter_id === chapterId);
    return (w?.weight ?? 0) > 0;
  }, [weights]);

  const handleToggle = (componentId: string, chapterId: string, checked: boolean) => {
    upsertWeight.mutate({
      assessment_id: selectedAssessmentId,
      component_id: componentId,
      chapter_id: chapterId,
      weight: checked ? 1 : 0,
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

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Selected chapters are eligible sources for questions. Not all must appear in the exam.</span>
      </div>

      {selectedAssessmentId && components && components.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Chapter</TableHead>
                {components.map(comp => (
                  <TableHead key={comp.id} className="text-center min-w-[120px]">
                    {COMPONENT_LABELS[comp.component_type] || comp.component_type}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={components.length + 1} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    From SUR-423 (General Surgery Book)
                  </TableCell>
                </TableRow>
              )}
              {crossChapters.map(chapter => (
                <ChapterEligibilityRow
                  key={chapter.id}
                  chapter={chapter}
                  components={components}
                  isEligible={isEligible}
                  onToggle={handleToggle}
                  canManage={canManage}
                />
              ))}
              {crossChapters.length > 0 && ownChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={components.length + 1} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    SUR-523 Chapters
                  </TableCell>
                </TableRow>
              )}
              {ownChapters.map(chapter => (
                <ChapterEligibilityRow
                  key={chapter.id}
                  chapter={chapter}
                  components={components}
                  isEligible={isEligible}
                  onToggle={handleToggle}
                  canManage={canManage}
                />
              ))}
              {/* Summary row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Eligible Chapters</TableCell>
                {components.map(comp => {
                  const count = allChapters.filter(ch => isEligible(comp.id, ch.id)).length;
                  return (
                    <TableCell key={comp.id} className="text-center">
                      <Badge variant={count > 0 ? 'default' : 'secondary'}>{count} / {allChapters.length}</Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {selectedAssessmentId && (!components || components.length === 0) && (
        <p className="text-muted-foreground text-sm py-4">No components defined for this assessment. Add components in the Exam Structure tab first.</p>
      )}

      {!selectedAssessmentId && (
        <p className="text-muted-foreground text-sm py-4">Select an assessment above to manage chapter eligibility.</p>
      )}
    </div>
  );
}

function ChapterEligibilityRow({ chapter, components, isEligible, onToggle, canManage }: {
  chapter: { id: string; title: string; module_id: string; book_label: string };
  components: any[];
  isEligible: (componentId: string, chapterId: string) => boolean;
  onToggle: (componentId: string, chapterId: string, checked: boolean) => void;
  canManage: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{chapter.title}</TableCell>
      {components.map(comp => (
        <TableCell key={comp.id} className="text-center">
          <Checkbox
            checked={isEligible(comp.id, chapter.id)}
            onCheckedChange={(checked) => onToggle(comp.id, chapter.id, !!checked)}
            disabled={!canManage}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}
