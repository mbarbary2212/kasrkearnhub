import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createEmptyCard, Rating, type Grade } from 'ts-fsrs';
import { scheduler, rowToCard } from '@/lib/fsrs';
import { captureWithContext } from '@/lib/sentry';

// ─── Rating string → ts-fsrs Grade ────────────────────────────
const RATING_MAP: Record<string, Grade> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

// ─── Numeric State → DB string name ──────────────────────────
const STATE_NAMES: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Review',
  3: 'Relearning',
};

// ─── useScheduleCard ───────────────────────────────────────────
export function useScheduleCard() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, unschedule }: { cardId: string; unschedule: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (unschedule) {
        const { error } = await supabase
          .from('flashcard_states' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId);
        if (error) {
          captureWithContext(error, {
            tags: { feature: 'db_write', table: 'flashcard_states', operation: 'delete' },
            extra: {
              student_user_id: user.id,
              card_id: cardId,
              error_code: (error as any)?.code,
              error_message: error.message,
              supabase_hint: (error as any)?.hint,
            },
          });
          throw error;
        }
      } else {
        const empty = createEmptyCard();
        const { error } = await supabase
          .from('flashcard_states' as any)
          .upsert(
            {
              user_id: user.id,
              card_id: cardId,
              due: empty.due.toISOString(),
              stability: empty.stability,
              difficulty: empty.difficulty,
              elapsed_days: empty.elapsed_days,
              scheduled_days: empty.scheduled_days,
              reps: empty.reps,
              lapses: empty.lapses,
              state: 'New',
              last_review: null,
              learning_steps: 0,
            } as any,
            { onConflict: 'user_id,card_id' }
          );
        if (error) {
          captureWithContext(error, {
            tags: { feature: 'db_write', table: 'flashcard_states', operation: 'upsert' },
            extra: {
              student_user_id: user.id,
              card_id: cardId,
              error_code: (error as any)?.code,
              error_message: error.message,
              supabase_hint: (error as any)?.hint,
            },
          });
          throw error;
        }
      }
    },
    onSuccess: (_, { unschedule }) => {
      toast.success(
        unschedule
          ? 'Card removed from your study schedule'
          : 'Card added to your study schedule'
      );
      qc.invalidateQueries({ queryKey: ['flashcard-states'] });
    },
    onError: () => toast.error('Failed to update schedule'),
  });
}

// ─── useRateCard ───────────────────────────────────────────────
export function useRateCard() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: string }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch current state (may not exist for first-time ratings)
      const { data: row, error: fetchErr } = await supabase
        .from('flashcard_states' as any)
        .select('*')
        .eq('user_id', user!.id)
        .eq('card_id', cardId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      // 2. Reconstruct Card — use empty card if no prior state
      const card = row ? rowToCard(row as any) : createEmptyCard();
      const mappedRating = RATING_MAP[rating];
      if (mappedRating === undefined) throw new Error(`Invalid rating: ${rating}`);

      const now = new Date();
      const result = scheduler.next(card, now, mappedRating);
      const newCard = result.card;

      // 3. Upsert flashcard_states
      const { error: upsertErr } = await supabase
        .from('flashcard_states' as any)
        .upsert(
          {
            user_id: user.id,
            card_id: cardId,
            due: newCard.due.toISOString(),
            stability: newCard.stability,
            difficulty: newCard.difficulty,
            elapsed_days: newCard.elapsed_days,
            scheduled_days: newCard.scheduled_days,
            reps: newCard.reps,
            lapses: newCard.lapses,
            state: STATE_NAMES[newCard.state as number] ?? 'New',
            last_review: newCard.last_review
              ? newCard.last_review.toISOString()
              : now.toISOString(),
            learning_steps: newCard.learning_steps ?? 0,
          } as any,
          { onConflict: 'user_id,card_id' }
        );
      if (upsertErr) {
        captureWithContext(upsertErr, {
          tags: { feature: 'db_write', table: 'flashcard_states', operation: 'upsert' },
          extra: {
            student_user_id: user.id,
            card_id: cardId,
            rating,
            error_code: (upsertErr as any)?.code,
            error_message: upsertErr.message,
            supabase_hint: (upsertErr as any)?.hint,
          },
        });
        throw upsertErr;
      }

      // 4. Insert review log
      const { error: logErr } = await supabase
        .from('flashcard_review_logs' as any)
        .insert({
          user_id: user.id,
          card_id: cardId,
          rating,
          scheduled_days: newCard.scheduled_days,
          elapsed_days: newCard.elapsed_days,
          reviewed_at: now.toISOString(),
        } as any);
      if (logErr) {
        captureWithContext(logErr, {
          tags: { feature: 'db_write', table: 'flashcard_review_logs', operation: 'insert' },
          extra: {
            student_user_id: user.id,
            card_id: cardId,
            rating,
            error_code: (logErr as any)?.code,
            error_message: logErr.message,
            supabase_hint: (logErr as any)?.hint,
          },
        });
        throw logErr;
      }

      return { scheduledDays: newCard.scheduled_days };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flashcard-states'] });
    },
    onError: () => toast.error('Failed to save review'),
  });
}

// ─── useDueCards ───────────────────────────────────────────────
export function useDueCards() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['flashcard-states', 'due', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date().toISOString();

      // 1. Get due flashcard_states
      const { data: states, error } = await supabase
        .from('flashcard_states' as any)
        .select('*')
        .eq('user_id', user!.id)
        .lte('due', now);
      if (error) throw error;

      const rows = (states as any[]) || [];
      if (!rows.length) return [];

      // 2. Fetch card content
      const cardIds = rows.map((r) => r.card_id);
      const { data: resources, error: resErr } = await supabase
        .from('study_resources')
        .select('id, title, content, chapter_id, module_id')
        .in('id', cardIds)
        .eq('is_deleted', false);
      if (resErr) throw resErr;

      // 3. Fetch chapter names
      const chapterIds = [...new Set((resources || []).map((r) => r.chapter_id).filter(Boolean))];
      let chaptersMap: Record<string, string> = {};
      if (chapterIds.length) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id, title')
          .in('id', chapterIds);
        chaptersMap = Object.fromEntries((chapters || []).map((c) => [c.id, c.title]));
      }

      const resourceMap = Object.fromEntries((resources || []).map((r) => [r.id, r]));

      return rows
        .filter((r) => resourceMap[r.card_id])
        .map((r) => {
          const res = resourceMap[r.card_id];
          return {
            // FSRS state
            stateId: r.id,
            cardId: r.card_id,
            due: r.due,
            stability: r.stability,
            difficulty: r.difficulty,
            elapsedDays: r.elapsed_days,
            scheduledDays: r.scheduled_days,
            reps: r.reps,
            lapses: r.lapses,
            fsrsState: r.state,
            lastReview: r.last_review,
            // Card content
            title: res.title,
            content: res.content,
            chapterId: res.chapter_id,
            moduleId: res.module_id,
            chapterTitle: res.chapter_id ? chaptersMap[res.chapter_id] || 'Unknown' : null,
          };
        });
    },
  });
}

// ─── useDueCardCount ──────────────────────────────────────────
export function useDueCardCount() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['flashcard-states', 'due-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from('flashcard_states' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .lte('due', now);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

// ─── useUpcomingCardCounts ────────────────────────────────────
export function useUpcomingCardCounts() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['flashcard-states', 'upcoming', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcard_states' as any)
        .select('due, state')
        .eq('user_id', user!.id);
      if (error) throw error;

      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const startOfTomorrow = new Date(now);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      startOfTomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(startOfTomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const in7 = new Date(now);
      in7.setDate(in7.getDate() + 7);
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);

      let today = 0,
        tomorrow = 0,
        inWeek = 0,
        inMonth = 0;

      for (const row of (data as any[]) || []) {
        const d = new Date(row.due);
        if (d <= endOfToday) today++;
        else if (d >= startOfTomorrow && d <= endOfTomorrow) tomorrow++;
        else if (d > endOfToday && d <= in7) inWeek++;
        else if (d > in7 && d <= in30) inMonth++;
      }

      return { today, tomorrow, inWeek, inMonth };
    },
    staleTime: 60_000,
  });
}

// ─── useIsCardScheduled ───────────────────────────────────────
export function useIsCardScheduled(cardId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['flashcard-states', 'is-scheduled', cardId, user?.id],
    enabled: !!user && !!cardId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('flashcard_states' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('card_id', cardId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 30_000,
  });
}

// ─── useCardState ─────────────────────────────────────────────
export function useCardState(cardId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['flashcard-states', 'card-state', cardId, user?.id],
    enabled: !!user && !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcard_states' as any)
        .select('*')
        .eq('user_id', user!.id)
        .eq('card_id', cardId!)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
    staleTime: 30_000,
  });
}
