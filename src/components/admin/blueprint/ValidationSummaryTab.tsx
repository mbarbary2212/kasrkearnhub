import { Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAssessments,
  useModuleChapters,
  useChapterEligibility,
} from '@/hooks/useAssessmentBlueprint';

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
        <span>This summary shows which chapters are in the question pool for each assessment. Eligibility means a chapter <em>can</em> appear, not that it <em>must</em>.</span>
      </div>
      {assessments.map(assessment => (
        <AssessmentValidationCard key={assessment.id} assessment={assessment} chapters={chapters ?? []} />
      ))}
    </div>
  );
}

function AssessmentValidationCard({ assessment, chapters }: { assessment: any; chapters: any[] }) {
  const { data: eligibility } = useChapterEligibility(assessment.id);

  if (!eligibility) return null;

  const included = eligibility.filter(e => e.included_in_exam);
  const mcqCount = included.filter(e => e.allow_mcq).length;
  const recallCount = included.filter(e => e.allow_recall).length;
  const caseCount = included.filter(e => e.allow_case).length;

  const notIncluded = chapters.filter(ch => !eligibility.find(e => e.chapter_id === ch.id && e.included_in_exam));

  const hasIssues = notIncluded.length > 0 || included.length === 0;

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
          <p className="text-sm font-medium mb-2">Question Pool Summary</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead className="text-center">Eligible Chapters</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Included in Exam</TableCell>
                <TableCell className="text-center">{included.length} / {chapters.length}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={included.length > 0 ? 'default' : 'destructive'}>
                    {included.length > 0 ? '✓ Set' : 'None selected'}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>MCQ Pool</TableCell>
                <TableCell className="text-center">{mcqCount}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={mcqCount > 0 ? 'default' : 'secondary'}>
                    {mcqCount > 0 ? '✓ Ready' : 'Empty'}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Recall Pool</TableCell>
                <TableCell className="text-center">{recallCount}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={recallCount > 0 ? 'default' : 'secondary'}>
                    {recallCount > 0 ? '✓ Ready' : 'Empty'}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Case Pool</TableCell>
                <TableCell className="text-center">{caseCount}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={caseCount > 0 ? 'default' : 'secondary'}>
                    {caseCount > 0 ? '✓ Ready' : 'Empty'}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {notIncluded.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-destructive">Chapters Not in Question Pool ({notIncluded.length})</p>
            <div className="flex flex-wrap gap-1">
              {notIncluded.map(ch => (
                <Badge key={ch.id} variant="outline" className="text-xs">{ch.title}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
