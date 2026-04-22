import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, XCircle, Home, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { McqAnswerArea } from '@/components/question-session/McqAnswerArea';
import { MCQFSRSRatingButtons } from '@/components/question-session/MCQFSRSRatingButtons';
import type { Mcq, McqChoice } from '@/hooks/useMcqs';

const SESSION_CAP = 30;

function mapDbRowToMcq(row: any): Mcq {
  return {
    id: row.id,
    module_id: row.module_id,
    chapter_id: row.chapter_id ?? null,
    section_id: row.section_id ?? null,
    stem: row.stem,
    choices: row.choices as McqChoice[],
    correct_key: row.correct_key,
    explanation: row.explanation ?? null,
    difficulty: row.difficulty ?? null,
    display_order: row.display_order ?? 0,
    is_deleted: row.is_deleted ?? false,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at,
    question_format: row.question_format ?? 'mcq',
    ai_confidence: row.ai_confidence ?? null,
  };
}

/** Loads all due MCQs for the current student (cap 30, oldest-due first). */
function useDueMCQs() {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ['mcq-review-session', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      // 1. Get due state rows (most overdue first)
      const { data: states, error: stateErr } = await supabase
        .from('mcq_states' as any)
        .select('mcq_id, due')
        .eq('user_id', user!.id)
        .lte('due', nowIso)
        .order('due', { ascending: true })
        .limit(SESSION_CAP);
      if (stateErr) throw stateErr;
      const ids = (states ?? []).map((s: any) => s.mcq_id);
      if (ids.length === 0) return [];

      // 2. Hydrate the MCQ rows
      const { data: mcqs, error: mcqErr } = await supabase
        .from('mcqs')
        .select('*')
        .in('id', ids)
        .eq('is_deleted', false);
      if (mcqErr) throw mcqErr;

      // Preserve original due-order
      const byId = new Map<string, Mcq>();
      (mcqs ?? []).forEach((row: any) => byId.set(row.id, mapDbRowToMcq(row)));
      return ids.map(id => byId.get(id)).filter((q): q is Mcq => !!q);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export default function MCQReviewPage() {
  const navigate = useNavigate();
  const { data: queue, isLoading } = useDueMCQs();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [ratingCounts, setRatingCounts] = useState<Record<string, number>>({
    Again: 0, Hard: 0, Good: 0, Easy: 0,
  });

  // Snapshot the queue as loaded so removing one doesn't shift indexes mid-session
  const session = useMemo(() => queue ?? [], [queue]);

  // If we ran out of cards mid-session, mark complete
  useEffect(() => {
    if (!isLoading && session.length === 0 && !completed) {
      // empty state (no completion summary needed)
    }
  }, [isLoading, session.length, completed]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Skeleton className="h-64 w-full max-w-xl rounded-xl" />
      </div>
    );
  }

  // Empty state — no cards due at all
  if (session.length === 0 && !completed) {
    return <AllCaughtUpScreen />;
  }

  // Session summary
  if (completed) {
    const reviewed = ratingCounts.Again + ratingCounts.Hard + ratingCounts.Good + ratingCounts.Easy;
    const goodOrEasy = ratingCounts.Good + ratingCounts.Easy;
    const hardOrAgain = ratingCounts.Hard + ratingCounts.Again;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold text-foreground">Review session complete</h2>
        <p className="text-muted-foreground max-w-md">
          {reviewed} MCQ{reviewed !== 1 ? 's' : ''} reviewed · {goodOrEasy} as Good or Easy · {hardOrAgain} as Hard or Again
        </p>
        <Button size="lg" onClick={() => navigate('/')} className="gap-2 mt-2">
          <Home className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const current = session[currentIndex];
  if (!current) {
    // Shouldn't happen, but guard
    setCompleted(true);
    return null;
  }

  const handleSubmit = (key: string) => {
    setSelectedKey(key);
    setSubmitted(true);
  };

  const advance = () => {
    if (currentIndex >= session.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex(i => i + 1);
    setSelectedKey(null);
    setSubmitted(false);
  };

  const isCorrect = submitted && selectedKey === current.correct_key;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
          <XCircle className="w-4 h-4" /> Exit
        </Button>
        <div className="text-sm text-muted-foreground font-medium">
          MCQ Review · {currentIndex + 1} of {session.length}
        </div>
        <div className="w-[60px]" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-sm">
              Q{currentIndex + 1} / {session.length}
            </Badge>
            {submitted && (
              <Badge
                variant="secondary"
                className={
                  isCorrect
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }
              >
                {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </Badge>
            )}
          </div>

          <McqAnswerArea
            key={current.id}
            question={current}
            isSubmitted={submitted}
            previousSelectedKey={selectedKey}
            questionType="mcq"
            onSubmit={handleSubmit}
          />

          {/* Explanation reveal */}
          {submitted && current.explanation && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Explanation</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{current.explanation}</p>
            </div>
          )}

          {/* Rating buttons after answer revealed */}
          {submitted && (
            <div className="pt-2">
              <MCQFSRSRatingButtons
                mcqId={current.id}
                onRated={(scheduledDays) => {
                  // Tally last rating from button text isn't returned; track via wrapping handler
                  // We don't know which rating was picked here, so tally Good as a default fallback.
                  // Better: read it back from the schedule — Again ~< 1 day. We approximate:
                  let bucket = 'Good';
                  if (scheduledDays < 1) bucket = 'Again';
                  else if (scheduledDays < 4) bucket = 'Hard';
                  else if (scheduledDays < 14) bucket = 'Good';
                  else bucket = 'Easy';
                  setRatingCounts(prev => ({ ...prev, [bucket]: (prev[bucket] || 0) + 1 }));
                  advance();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── All Caught Up screen ───────────────────────────────────────
function AllCaughtUpScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">All caught up</h2>
      <p className="text-muted-foreground max-w-sm">
        No MCQs are due for review right now.
      </p>
      <Button size="lg" onClick={() => navigate('/')} className="gap-2 mt-2">
        <Home className="w-4 h-4" /> Back to Dashboard
      </Button>
    </div>
  );
}
