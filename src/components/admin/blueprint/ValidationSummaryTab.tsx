import { Loader2, Info } from 'lucide-react';
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
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>This summary shows which chapters are in the question pool for each assessment and component. Eligibility means a chapter <em>can</em> appear, not that it <em>must</em>.</span>
      </div>
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

  // Per-component: count eligible chapters
  const componentSummary = components.map(comp => {
    const eligibleChapters = chapters.filter(ch => {
      const w = weights?.find((wt: any) => wt.component_id === comp.id && wt.chapter_id === ch.id);
      return (w?.weight ?? 0) > 0;
    });
    return { ...comp, eligibleCount: eligibleChapters.length, eligibleChapterNames: eligibleChapters.map(c => c.title) };
  });

  // Chapters not eligible for ANY component
  const chaptersInPool = new Set(
    weights?.filter((w: any) => w.weight > 0).map((w: any) => w.chapter_id) ?? []
  );
  const chaptersNotInPool = chapters.filter(ch => !chaptersInPool.has(ch.id));

  const hasIssues = chaptersNotInPool.length > 0 || componentSummary.some(c => c.eligibleCount === 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          {assessment.name}
          <Badge variant={hasIssues ? 'destructive' : 'default'}>{hasIssues ? 'Review Needed' : 'OK'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Component Question Pool</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead className="text-center">Eligible Chapters</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentSummary.map(cv => (
                <TableRow key={cv.id}>
                  <TableCell>{COMPONENT_LABELS[cv.component_type] || cv.component_type}</TableCell>
                  <TableCell className="text-center">{cv.eligibleCount} / {chapters.length}</TableCell>
                  <TableCell className="text-center">
                    {cv.eligibleCount === 0 ? (
                      <Badge variant="destructive">No chapters selected</Badge>
                    ) : (
                      <Badge variant="default">✓ Pool ready</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {chaptersNotInPool.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-destructive">Chapters Not in Any Question Pool ({chaptersNotInPool.length})</p>
            <div className="flex flex-wrap gap-1">
              {chaptersNotInPool.map(ch => (
                <Badge key={ch.id} variant="outline" className="text-xs">{ch.title}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
