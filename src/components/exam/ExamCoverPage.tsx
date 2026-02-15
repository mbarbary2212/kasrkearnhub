import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, FileText, BookOpen, AlertTriangle, Play } from 'lucide-react';
import { PaperConfig } from './ExamPaperConfig';

interface ExamCoverPageProps {
  examName: string;
  moduleName: string;
  papers: PaperConfig[];
  onStart: () => void;
  isLoading?: boolean;
}

export function ExamCoverPage({
  examName,
  moduleName,
  papers,
  onStart,
  isLoading = false,
}: ExamCoverPageProps) {
  const totalDuration = papers.reduce((s, p) => s + p.duration_minutes, 0);
  const totalMarks = papers.reduce((sum, p) => {
    const c = p.components;
    if (p.category === 'written') {
      return sum + c.mcq_count * c.mcq_points + c.essay_count * c.essay_points;
    }
    return sum +
      (c.osce_count || 0) * (c.osce_points || 0) +
      (c.clinical_case_count || 0) * (c.clinical_case_points || 0) +
      (c.poxa_count || 0) * (c.poxa_points || 0);
  }, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header / Faculty placeholder */}
      <Card className="border-2">
        <CardHeader className="text-center space-y-3 pb-4">
          {/* Logo placeholder */}
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Faculty of Medicine</p>
            <h1 className="text-xl font-heading font-bold mt-1">{examName}</h1>
            <p className="text-sm text-muted-foreground">{moduleName}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Exam summary badges */}
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="gap-1.5 py-1 px-3">
              <Clock className="w-3.5 h-3.5" />
              {totalDuration} minutes
            </Badge>
            <Badge variant="secondary" className="gap-1.5 py-1 px-3">
              <FileText className="w-3.5 h-3.5" />
              {totalMarks} marks
            </Badge>
            <Badge variant="secondary" className="py-1 px-3">
              {papers.length} paper{papers.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <Separator />

          {/* Paper breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Sections Breakdown</h3>
            {papers.map((paper, idx) => {
              const c = paper.components;
              const isWritten = paper.category === 'written';
              const paperMarks = isWritten
                ? c.mcq_count * c.mcq_points + c.essay_count * c.essay_points
                : (c.osce_count || 0) * (c.osce_points || 0) +
                  (c.clinical_case_count || 0) * (c.clinical_case_points || 0) +
                  (c.poxa_count || 0) * (c.poxa_points || 0);

              return (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{paper.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {paperMarks} marks · {paper.duration_minutes} min
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {isWritten && c.mcq_count > 0 && (
                      <span>{c.mcq_count} MCQs ({c.mcq_count * c.mcq_points} marks)</span>
                    )}
                    {isWritten && c.essay_count > 0 && (
                      <span>{c.essay_count} Short Essays ({c.essay_count * c.essay_points} marks)</span>
                    )}
                    {!isWritten && (c.osce_count || 0) > 0 && (
                      <span>{c.osce_count} OSCE Stations</span>
                    )}
                    {!isWritten && (c.clinical_case_count || 0) > 0 && (
                      <span>{c.clinical_case_count} Clinical Cases</span>
                    )}
                    {!isWritten && (c.poxa_count || 0) > 0 && (
                      <span>{c.poxa_count} POXA Stations</span>
                    )}
                  </div>
                  {paper.instructions && (
                    <p className="text-xs italic text-muted-foreground mt-1">{paper.instructions}</p>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Student notice */}
          <div className="p-3 rounded-lg bg-accent/30 border border-accent">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-accent-foreground space-y-1">
                <p className="font-semibold">Important Notice</p>
                <p>
                  Short answers are handwritten in the real examination.
                  In this simulator, answers may be typed or written using the in-app handwriting tool.
                </p>
                <p>Spelling errors are not penalized.</p>
                <p className="mt-2">
                  Once started, the timer cannot be paused. The exam will auto-submit when time runs out.
                </p>
              </div>
            </div>
          </div>

          {/* Start button */}
          <Button
            onClick={onStart}
            disabled={isLoading}
            size="lg"
            className="w-full gap-2"
          >
            <Play className="w-4 h-4" />
            {isLoading ? 'Preparing Exam...' : 'Start Exam'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
