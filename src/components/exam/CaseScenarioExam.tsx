import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Send, ListChecks, Loader2 } from 'lucide-react';
import { getExpectedPoints } from '@/types/essayRubric';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CaseScenarioResult } from './CaseScenarioResult';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { useAuthContext } from '@/contexts/AuthContext';
import type { GradingResult } from '@/types/essayRubric';

interface CaseQuestion {
  id: string;
  case_id: string;
  question_text: string;
  max_marks: number;
  rubric_json?: unknown;
  display_order: number;
  reasoning_domain?: string | null;
}

interface ExamCase {
  id: string;
  stem: string;
  difficulty: string;
  chapter_id?: string | null;
  module_id?: string | null;
  topic_id?: string | null;
  questions: CaseQuestion[];
}

interface CaseGradingResult {
  total_score: number;
  max_score: number;
  percentage: number;
  questions: (GradingResult & { question_id: string })[];
  overall_feedback: string;
}

interface CaseScenarioExamProps {
  cases: ExamCase[];
  onComplete: () => void;
  chapterId?: string;
}

export function CaseScenarioExam({ cases, onComplete, chapterId }: CaseScenarioExamProps) {
  const { user } = useAuthContext();
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<Record<string, CaseGradingResult>>({});
  const [grading, setGrading] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const { markComplete } = useMarkItemComplete();

  const currentCase = cases[currentCaseIndex];
  const caseAnswers = answers[currentCase?.id] || {};
  const currentResult = results[currentCase?.id];

  const allQuestionsAnswered = currentCase?.questions.every(
    q => (caseAnswers[q.id] || '').trim().length > 0
  );

  const handleSubmitCase = async () => {
    if (!allQuestionsAnswered) {
      toast.error('Please answer all parts before submitting');
      return;
    }

    setGrading(true);
    try {
      const answerPayload = currentCase.questions.map(q => ({
        question_id: q.id,
        answer: caseAnswers[q.id] || '',
      }));

      const { data, error } = await supabase.functions.invoke('grade-short-essay', {
        body: {
          mode: 'case_scenario',
          case_scenario_id: currentCase.id,
          answers: answerPayload,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(prev => ({ ...prev, [currentCase.id]: data }));

      // Store detailed attempt data for reasoning profile
      const effectiveChapterId = chapterId || currentCase.chapter_id;
      if (user?.id && data?.questions) {
        const attemptRows = (data.questions as Array<GradingResult & { question_id: string }>).map((qr) => {
          const questionMeta = currentCase.questions.find(q => q.id === qr.question_id);
          return {
            user_id: user.id,
            case_id: currentCase.id,
            question_id: qr.question_id,
            chapter_id: effectiveChapterId || null,
            topic_id: currentCase.topic_id || null,
            module_id: currentCase.module_id || null,
            reasoning_domain: questionMeta?.reasoning_domain || null,
            score: qr.score ?? 0,
            max_score: qr.max_score ?? questionMeta?.max_marks ?? 0,
            percentage: qr.percentage ?? (qr.max_score ? Math.round(((qr.score ?? 0) / qr.max_score) * 100) : 0),
            missing_critical_points: qr.missing_critical_points || [],
            confidence_score: qr.confidence_score ?? 0,
          };
        });

        // Insert in background — don't block UI
        supabase.from('case_attempt_details').insert(attemptRows).then(({ error: insertErr }) => {
          if (insertErr) console.error('Failed to store case attempt details:', insertErr);
        });
      }

      // Mark case complete after ALL sub-questions graded
      if (effectiveChapterId) {
        markComplete(currentCase.id, 'case_scenario', effectiveChapterId);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Grading failed. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const handleFinish = () => {
    setFinished(true);
    onComplete();
  };

  // Summary view
  if (finished) {
    const allResults = cases.map(c => ({
      caseData: c,
      result: results[c.id],
    }));

    const totalScore = allResults.reduce((sum, r) => sum + (r.result?.total_score || 0), 0);
    const totalMax = allResults.reduce((sum, r) => sum + (r.result?.max_score || 0), 0);
    const avgPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Case Qs Results</h2>
          <p className="text-4xl font-bold text-primary">{avgPercentage}%</p>
          <p className="text-sm text-muted-foreground">{totalScore}/{totalMax} points</p>
        </div>
        {allResults.map(({ caseData, result }, i) => (
          <div key={caseData.id} className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Case {i + 1}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{caseData.stem}</p>
            {result ? (
              <CaseScenarioResult
                result={result}
                questions={caseData.questions}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">Not submitted</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Case {currentCaseIndex + 1} / {cases.length}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {Object.keys(results).length} graded
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="case-exam-mode" className="text-xs text-muted-foreground">Exam Mode</Label>
          <Switch
            id="case-exam-mode"
            checked={examMode}
            onCheckedChange={setExamMode}
            className="h-4 w-7"
          />
        </div>
      </div>

      {/* Clinical Stem */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Clinical Scenario</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-foreground whitespace-pre-wrap">{currentCase.stem}</p>
        </div>
      </div>

      {/* Results or Answer Areas */}
      {currentResult ? (
        <CaseScenarioResult result={currentResult} questions={currentCase.questions} />
      ) : (
        <div className="space-y-4">
          {currentCase.questions.map((q, i) => {
            const expectedPts = getExpectedPoints(q.rubric_json);
            return (
              <div key={q.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Part {String.fromCharCode(65 + i)}</h4>
                  {!examMode && expectedPts && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ListChecks className="h-3 w-3" />≈ {expectedPts} pts
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{q.question_text}</p>
                <Textarea
                  value={caseAnswers[q.id] || ''}
                  onChange={e =>
                    setAnswers(prev => ({
                      ...prev,
                      [currentCase.id]: { ...prev[currentCase.id], [q.id]: e.target.value },
                    }))
                  }
                  placeholder="Type your answer..."
                  rows={4}
                  className="text-sm"
                  disabled={grading}
                />
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitCase}
              disabled={grading || !allQuestionsAnswered}
              className="gap-2"
            >
              {grading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {grading ? 'Grading...' : 'Submit All Answers'}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => setCurrentCaseIndex(i => i - 1)} disabled={currentCaseIndex === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" />Previous Case
        </Button>
        {currentCaseIndex === cases.length - 1 ? (
          <Button variant="default" size="sm" onClick={handleFinish}>Finish</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCurrentCaseIndex(i => i + 1)}>
            Next Case<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
