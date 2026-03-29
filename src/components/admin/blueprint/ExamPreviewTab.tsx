import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAssessments } from '@/hooks/useAssessmentBlueprint';
import { dryRunAssembly } from '@/lib/blueprint/examGenerator';
import type { GenerationResult, GeneratedQuestion } from '@/lib/blueprint/examGenerator';
import type { ExamDebugReport } from '@/lib/blueprint/examValidator';
import { cn } from '@/lib/utils';

const COMPONENT_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  short_answer_recall: 'Recall',
  short_answer_case: 'Case',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  difficult: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface Props {
  moduleId: string;
  yearId: string;
}

export function ExamPreviewTab({ moduleId, yearId }: Props) {
  const { data: assessments, isLoading: loadingAssessments } = useAssessments(moduleId, yearId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleGenerate = async (assessmentId: string) => {
    setSelectedId(assessmentId);
    setRunning(true);
    setResult(null);
    try {
      const r = await dryRunAssembly(assessmentId);
      setResult(r as GenerationResult);
    } catch (err: any) {
      setResult({ success: false, questions: [], warnings: [], errors: [err.message] });
    } finally {
      setRunning(false);
    }
  };

  if (loadingAssessments) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!assessments?.length) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No assessments defined. Create one in the Exam Structure tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Assessment selector */}
      <div className="flex flex-wrap gap-3">
        {assessments.map(a => (
          <Button
            key={a.id}
            variant={selectedId === a.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleGenerate(a.id)}
            disabled={running}
          >
            {running && selectedId === a.id && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            <Play className="w-3 h-3 mr-1.5" />
            {a.name}
          </Button>
        ))}
      </div>

      {running && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating preview…
        </div>
      )}

      {result && !running && <ExamPreviewResult result={result} />}
    </div>
  );
}

// ── Result display ──

function ExamPreviewResult({ result }: { result: GenerationResult }) {
  const debug = result.debugReport;

  const mcqs = result.questions.filter(q => q.componentType === 'mcq');
  const recalls = result.questions.filter(q => q.componentType === 'short_answer_recall');
  const cases = result.questions.filter(q => q.componentType === 'short_answer_case');

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className={cn(
        'border-l-4',
        result.success ? 'border-l-green-500' : 'border-l-destructive'
      )}>
        <CardContent className="py-4 flex items-center gap-3">
          {result.success
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          }
          <div>
            <p className="font-medium">
              {result.success
                ? `Preview generated: ${result.questions.length} questions`
                : 'Generation failed'}
            </p>
            {result.errors.length > 0 && (
              <ul className="text-sm text-destructive mt-1 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <WarningsSection warnings={result.warnings} />
      )}

      {/* Debug summary */}
      {debug && <DebugSummary debug={debug} />}

      {/* Question sections */}
      {mcqs.length > 0 && (
        <QuestionSection title="MCQ" questions={mcqs} />
      )}
      {recalls.length > 0 && (
        <QuestionSection title="Recall" questions={recalls} />
      )}
      {cases.length > 0 && (
        <QuestionSection title="Case" questions={cases} />
      )}
    </div>
  );
}

// ── Warnings ──

function WarningsSection({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="text-sm text-muted-foreground mt-2 space-y-1 pl-6">
          {warnings.map((w, i) => <li key={i} className="list-disc">{w}</li>)}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Debug summary cards ──

function DebugSummary({ debug }: { debug: ExamDebugReport }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          Debug Summary
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Component breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Components</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(debug.componentBreakdown).map(([type, info]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span>{COMPONENT_LABELS[type] || type}</span>
                  <span className={cn(
                    'font-mono',
                    info.shortfall > 0 ? 'text-destructive' : 'text-green-600'
                  )}>
                    {info.selected}/{info.requested}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Difficulty */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Difficulty Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(['easy', 'moderate', 'difficult'] as const).map(tier => {
                const actual = debug.difficultyBreakdown.actual[tier];
                const total = debug.difficultyBreakdown.actual.easy + debug.difficultyBreakdown.actual.moderate + debug.difficultyBreakdown.actual.difficult;
                const pct = total > 0 ? ((actual / total) * 100).toFixed(0) : '0';
                const target = debug.difficultyBreakdown.target[tier];
                const dev = debug.difficultyBreakdown.deviations[tier];
                return (
                  <div key={tier} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{tier}</span>
                    <span className={cn('font-mono', dev > 10 ? 'text-destructive' : 'text-muted-foreground')}>
                      {pct}% / {target}%
                    </span>
                  </div>
                );
              })}
              {debug.difficultyBreakdown.actual.unknown > 0 && (
                <div className="text-xs text-muted-foreground">
                  {debug.difficultyBreakdown.actual.unknown} without difficulty
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rule checks */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rule Checks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <RuleCheck
                label="No Recall/Case overlap"
                checked={debug.ruleChecks.noRecallCaseOverlap.checked}
                passed={debug.ruleChecks.noRecallCaseOverlap.passed}
              />
              <RuleCheck
                label="No MCQ topic repeat"
                checked={debug.ruleChecks.noMcqTopicRepeat.checked}
                passed={debug.ruleChecks.noMcqTopicRepeat.passed}
              />
              <RuleCheck
                label="All from eligible chapters"
                checked={debug.ruleChecks.allFromEligible.checked}
                passed={debug.ruleChecks.allFromEligible.passed}
              />
              <div className="text-xs text-muted-foreground pt-1">
                {debug.chapterCoverage.usedCount}/{debug.chapterCoverage.eligibleCount} chapters used
              </div>
            </CardContent>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RuleCheck({ label, checked, passed }: { label: string; checked: boolean; passed: boolean }) {
  if (!checked) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      {label} <span className="text-xs">(disabled)</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn('w-2 h-2 rounded-full', passed ? 'bg-green-500' : 'bg-destructive')} />
      {label}
    </div>
  );
}

// ── Question list ──

function QuestionSection({ title, questions }: { title: string; questions: GeneratedQuestion[] }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer group">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary">{questions.length}</Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium w-10">#</th>
                <th className="text-left p-3 font-medium">Question ID</th>
                <th className="text-left p-3 font-medium">Chapter</th>
                <th className="text-left p-3 font-medium">Topic</th>
                <th className="text-left p-3 font-medium">Difficulty</th>
                <th className="text-right p-3 font-medium">Marks</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => (
                <tr key={q.questionId} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-mono text-xs">{q.questionId.slice(0, 8)}…</td>
                  <td className="p-3 font-mono text-xs">{q.chapterId ? q.chapterId.slice(0, 8) + '…' : '—'}</td>
                  <td className="p-3 font-mono text-xs">{q.topicId ? q.topicId.slice(0, 8) + '…' : '—'}</td>
                  <td className="p-3">
                    {q.difficulty ? (
                      <Badge className={cn('text-xs', DIFFICULTY_COLORS[q.difficulty] || '')} variant="secondary">
                        {q.difficulty}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">{q.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
