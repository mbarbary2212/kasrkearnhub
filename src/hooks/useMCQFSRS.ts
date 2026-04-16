import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { createEmptyCard, Rating, type Grade } from 'ts-fsrs';
import { scheduler, rowToCard } from '@/lib/fsrs';

// ── Rating string → ts-fsrs Grade ────────────────────────────────
const RATING_MAP: Record<string, Grade> = {
  Again: Rating.Again,
  Hard:  Rating.Hard,
  Good:  Rating.Good,
  Easy:  Rating.Easy,
};

const STATE_NAMES: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Review',
  3: 'Relearning',
};

// ── useRateMCQ ────────────────────────────────────────────────────
/** Rate an MCQ with Again/Hard/Good/Easy — updates mcq_states via FSRS algorithm */
export function useRateMCQ() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ mcqId, rating }: { mcqId: string; rating: string }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch existing state (null = first time seeing this MCQ)
      const { data: row, error: fetchErr } = await supabase
        .from('mcq_states' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('mcq_id', mcqId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      // 2. Build ts-fsrs Card from row (or empty card for first review)
      const card = row
        ? rowToCard(row as any)
        : createEmptyCard();

      const mappedRating = RATING_MAP[rating];
      if (mappedRating === undefined) throw new Error(`Invalid rating: ${rating}`);

      const now = new Date();
      const result = scheduler.next(card, now, mappedRating);
      const newCard = result.card;

      // 3. Upsert mcq_states
      const { error: upsertErr } = await supabase
        .from('mcq_states' as any)
        .upsert(
          {
            user_id: user.id,
            mcq_id: mcqId,
            due: newCard.due.toISOString(),
            stability: newCard.stability,
            difficulty: newCard.difficulty,
            elapsed_days: newCard.elapsed_days,
            scheduled_days: newCard.scheduled_days,
            reps: newCard.reps,
            lapses: newCard.lapses,
            state: STATE_NAMES[newCard.state as number] ?? 'New',
            last_review: now.toISOString(),
            learning_steps: newCard.learning_steps ?? 0,
            updated_at: now.toISOString(),
          } as any,
          { onConflict: 'user_id,mcq_id' }
        );
      if (upsertErr) throw upsertErr;

      // 4. Insert review log
      const { error: logErr } = await supabase
        .from('mcq_review_logs' as any)
        .insert({
          user_id: user.id,
          mcq_id: mcqId,
          rating,
          scheduled_days: newCard.scheduled_days,
          elapsed_days: newCard.elapsed_days,
          reviewed_at: now.toISOString(),
        } as any);
      if (logErr) throw logErr;

      return { scheduledDays: newCard.scheduled_days };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcq-states'] });
    },
  });
}

// ── useDueMCQCount ────────────────────────────────────────────────
/** Returns count of MCQs due for review today for the current user */
export function useDueMCQCount() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['mcq-states', 'due-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from('mcq_states' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .lte('due', now);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

// ── useMCQState ───────────────────────────────────────────────────
/** Returns the current FSRS state for a single MCQ (null = never rated) */
export function useMCQState(mcqId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['mcq-states', 'single', mcqId, user?.id],
    enabled: !!user && !!mcqId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_states' as any)
        .select('*')
        .eq('user_id', user!.id)
        .eq('mcq_id', mcqId!)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
    staleTime: 30_000,
  });
}
