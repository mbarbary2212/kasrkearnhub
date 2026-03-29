import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAssessments,
  useAssessmentComponents,
  useModuleChapters,
  useChapterWeights,
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

interface Props {
  moduleId: string;
}

export function ValidationSummaryTab({ moduleId }: Props) {
  const { data: assessments, isLoading: aLoading } = useAssessments(moduleId, '');
  const { data: chapters, isLoading: cLoading } = useModuleChapters(moduleId);

  if (aLoading || cLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!assessments || assessments.length === 0) {
    return <p className="text-muted-foreground text-sm py-4 mt-4">No assessments to validate.</p>;
  }

  return (
    <div className="space-y-6 mt-4">
      {assessments.map(assessment => (
        <AssessmentValidationCard key={assessment.id} assessment={assessment} chapters={chapters ?? []} />
      ))}
    </div>
  );
}

function AssessmentValidationCard({ assessment, chapters }: { assessment: any; chapters: any[] }) {
  const { data: components } = useAssessmentComponents(assessment.id);
  const { data: weights } = useChapterWeights(assessment.id);

  if (!components) return null;

  const totalComponentMarks = components.reduce((s: number, c: any) => s + c.question_count * c.marks_per_question, 0);

  // Per-component validation
  const componentValidation = components.map(comp => {
    const expected = comp.question_count * comp.marks_per_question;
    const allocated = chapters.reduce((sum, ch) => {
      const w = weights?.find((wt: any) => wt.component_id === comp.id && wt.chapter_id === ch.id);
      return sum + (w?.weight ?? 0);
    }, 0);
    return {
      ...comp,
      expected,
      allocated,
      valid: Math.abs(allocated - expected) < 0.01,
    };
  });

  // Chapters with no allocation
  const chaptersWithWeights = new Set(weights?.map((w: any) => w.chapter_id) ?? []);
  const unallocatedChapters = chapters.filter(ch => !chaptersWithWeights.has(ch.id));

  const allValid = componentValidation.every(c => c.valid) && unallocatedChapters.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          {assessment.name}
          <Badge variant={allValid ? 'default' : 'destructive'}>{allValid ? 'Valid' : 'Issues Found'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Component Mark Allocation</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead className="text-center">Expected</TableHead>
                <TableHead className="text-center">Allocated</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentValidation.map(cv => (
                <TableRow key={cv.id}>
                  <TableCell>{COMPONENT_LABELS[cv.component_type] || cv.component_type}</TableCell>
                  <TableCell className="text-center">{cv.expected}</TableCell>
                  <TableCell className="text-center">{cv.allocated > 0 ? cv.allocated.toFixed(1) : '—'}</TableCell>
                  <TableCell className="text-center">
                    {cv.allocated === 0 ? (
                      <Badge variant="secondary">Not Set</Badge>
                    ) : cv.valid ? (
                      <Badge variant="default">✓ Match</Badge>
                    ) : (
                      <Badge variant="destructive">
                        {cv.allocated > cv.expected ? `+${(cv.allocated - cv.expected).toFixed(1)} over` : `${(cv.expected - cv.allocated).toFixed(1)} short`}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{totalComponentMarks}</TableCell>
                <TableCell className="text-center">
                  {componentValidation.reduce((s, c) => s + c.allocated, 0).toFixed(1)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {unallocatedChapters.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-destructive">Chapters with No Allocation ({unallocatedChapters.length})</p>
            <div className="flex flex-wrap gap-1">
              {unallocatedChapters.map(ch => (
                <Badge key={ch.id} variant="outline" className="text-xs">{ch.title}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
