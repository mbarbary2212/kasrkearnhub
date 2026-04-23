import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Trophy,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SectionType,
  SECTION_LABELS,
  SUMMARY_CATEGORY_MAP,
  CaseSectionAnswer,
} from '@/types/structuredCase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { captureWithContext, addAppBreadcrumb } from '@/lib/sentry';

export function CaseSummary() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  // Auto-expand all sections by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [sectionsInitialized, setSectionsInitialized] = useState(false);

  // Fetch attempt
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['case-attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .select(`
          *,
          case:virtual_patient_cases(id, title, level, module_id, chapter_id, active_sections, generated_case_data)
        `)
        .eq('id', attemptId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!attemptId,
  });

  // Fetch section answers
  const { data: sectionAnswers, isLoading: answersLoading } = useQuery({
    queryKey: ['case-section-answers', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_section_answers')
        .select('*')
        .eq('attempt_id', attemptId!)
        .order('created_at');
      if (error) throw error;
      return (data || []) as unknown as CaseSectionAnswer[];
    },
    enabled: !!attemptId,
    refetchInterval: (query) => {
      const answers = query.state.data;
      if (!answers) return 3000;
      const allScored = answers.every((a: any) => a.is_scored);
      return allScored ? false : 3000;
    },
  });

  // Retry scoring if answers are still unscored after 5 seconds
  const scoringRetryTriggered = useRef(false);
  const summaryMountTime = useRef(Date.now());

  useEffect(() => {
    if (scoringRetryTriggered.current) return;
    if (!sectionAnswers || sectionAnswers.length === 0) return;
    const allScored = sectionAnswers.every(a => a.is_scored);
    if (allScored) return;

    const elapsed = Date.now() - summaryMountTime.current;
    if (elapsed >= 5000) {
      scoringRetryTriggered.current = true;
      console.log('Scoring retry: triggering score-case-answers from summary page');
      addAppBreadcrumb('ai_call', 'score-case-answers retry from summary', {
        attempt_id: attemptId,
        case_id: attempt?.case?.id,
      });
      supabase.functions.invoke('score-case-answers', {
        body: { attempt_id: attemptId, case_id: attempt?.case?.id },
      }).catch(err => {
        console.warn('Scoring retry error:', err);
        captureWithContext(err, {
          tags: {
            feature: 'ai_call',
            ai_task: 'case_marking',
            provider: 'edge_function',
            subfeature: 'score_case_answers',
            retry: true,
          },
          extra: {
            attempt_id: attemptId,
            case_id: attempt?.case?.id,
            error_message: (err as Error)?.message,
          },
        });
      });
    }
  }, [sectionAnswers, attemptId, attempt]);

  // Auto-expand all sections once answers are loaded and scored
  useEffect(() => {
    if (sectionsInitialized || !sectionAnswers || sectionAnswers.length === 0) return;
    const allScored = sectionAnswers.every(a => a.is_scored);
    if (allScored) {
      setOpenSections(new Set(sectionAnswers.map(a => a.section_type)));
      setSectionsInitialized(true);
    }
  }, [sectionAnswers, sectionsInitialized]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isLoading = attemptLoading || answersLoading;
  const allScored = sectionAnswers?.every(a => a.is_scored) ?? false;
  const overallScore = attempt?.score ?? 0;

  // Compute summary categories
  const categorySummary = Object.entries(SUMMARY_CATEGORY_MAP).map(([label, sectionTypes]) => {
    const relevantAnswers = (sectionAnswers || []).filter(
      a => sectionTypes.includes(a.section_type as SectionType)
    );
    const totalScore = relevantAnswers.reduce((s, a) => s + (a.score || 0), 0);
    const totalMax = relevantAnswers.reduce((s, a) => s + (a.max_score || 0), 0);
    const percent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
    return { label, totalScore, totalMax, percent, answers: relevantAnswers };
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Attempt not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const caseTitle = attempt.case?.title || 'Case';
  const scoreColor = overallScore >= 70 ? 'text-green-600' : overallScore >= 50 ? 'text-yellow-600' : 'text-destructive';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => {
        const caseData = attempt?.case;
        if (caseData?.chapter_id && caseData?.module_id) {
          navigate(`/module/${caseData.module_id}/chapter/${caseData.chapter_id}?section=interactive`);
        } else if (caseData?.module_id) {
          navigate(`/module/${caseData.module_id}`);
        } else {
          navigate(-1);
        }
      }} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      {/* Score hero */}
      <Card className="overflow-hidden">
        <CardContent className="py-8 text-center">
          {!allScored ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <h2 className="text-xl font-semibold">Scoring in Progress...</h2>
              <p className="text-muted-foreground text-sm">AI is evaluating your answers. This may take a moment.</p>
            </div>
          ) : (
            <>
              <Trophy className={cn('w-16 h-16 mx-auto mb-3', scoreColor)} />
              <h2 className="text-4xl font-bold mb-1">{overallScore}%</h2>
              <p className="text-muted-foreground">{caseTitle}</p>
              <Badge className="mt-2" variant={overallScore >= 50 ? 'default' : 'destructive'}>
                {overallScore >= 70 ? 'Excellent' : overallScore >= 50 ? 'Pass' : 'Needs Improvement'}
              </Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Overall Performance Summary */}
      {allScored && (sectionAnswers || []).length > 0 && (() => {
        const allFeedback = (sectionAnswers || []).map(a => ({
          section: SECTION_LABELS[a.section_type as SectionType] || a.section_type,
          ...parseFeedback(a.ai_feedback),
        }));
        const topStrengths = [...new Set(allFeedback.flatMap(f => f.strengths))].slice(0, 4);
        const topGaps = [...new Set(allFeedback.flatMap(f => f.gaps))].slice(0, 4);
        const justifications = allFeedback.filter(f => f.justification);

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Overall Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-section justifications */}
              {justifications.length > 0 && (
                <div className="space-y-1.5">
                  {justifications.map((j, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium">{j.section}:</span>{' '}
                      <span className="text-muted-foreground">{j.justification}</span>
                    </p>
                  ))}
                </div>
              )}

              {(topStrengths.length > 0 || topGaps.length > 0) && <Separator />}

              <div className="grid gap-4 sm:grid-cols-2">
                {topStrengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2">Key Strengths</p>
                    <ul className="space-y-1.5">
                      {topStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {topGaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2">Areas to Improve</p>
                    <ul className="space-y-1.5">
                      {topGaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm">
                          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Summary categories */}
      {allScored && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorySummary.map(cat => (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {cat.percent != null ? `${cat.percent}%` : '—'}
                  </span>
                </div>
                {cat.percent != null && (
                  <Progress
                    value={cat.percent}
                    className={cn('h-2', cat.percent >= 70 ? '[&>div]:bg-green-500' : cat.percent >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-destructive')}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section detail breakdown */}
      {allScored && (sectionAnswers || []).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Section Details</h3>
          {(sectionAnswers || []).map(answer => {
            const feedback = parseFeedback(answer.ai_feedback);
            const percent = answer.max_score ? Math.round(((answer.score || 0) / answer.max_score) * 100) : 0;
            const isOpen = openSections.has(answer.section_type);

            return (
              <Collapsible key={answer.id} open={isOpen} onOpenChange={() => toggleSection(answer.section_type)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-sm font-medium">
                            {SECTION_LABELS[answer.section_type as SectionType] || answer.section_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{answer.score}/{answer.max_score}</span>
                          <Badge
                            variant={percent >= 70 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {percent}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {feedback.feedback && (
                        <p className="text-sm text-muted-foreground">{feedback.feedback}</p>
                      )}
                      {feedback.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Strengths</p>
                          <ul className="space-y-1">
                            {feedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedback.gaps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-destructive mb-1">Areas to Improve</p>
                          <ul className="space-y-1">
                            {feedback.gaps.map((g, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm">
                                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {allScored && (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => {
            const caseData = attempt?.case;
            if (caseData?.chapter_id && caseData?.module_id) {
              navigate(`/module/${caseData.module_id}/chapter/${caseData.chapter_id}?section=interactive`);
            } else if (caseData?.module_id) {
              navigate(`/module/${caseData.module_id}`);
            } else {
              navigate(-1);
            }
          }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cases
          </Button>
          {attempt.case?.id && (
            <Button
              className="flex-1"
              onClick={() => navigate(`/virtual-patient/${attempt.case.id}`)}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function parseFeedback(raw: string | null): {
  feedback: string;
  justification: string;
  strengths: string[];
  gaps: string[];
} {
  if (!raw) return { feedback: '', justification: '', strengths: [], gaps: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      feedback: parsed.feedback || '',
      justification: parsed.justification || '',
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
    };
  } catch {
    return { feedback: raw, justification: '', strengths: [], gaps: [] };
  }
}
