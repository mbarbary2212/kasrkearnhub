import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── useScheduleCard ───────────────────────────────────────────
export function useScheduleCard() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, unschedule }: { cardId: string; unschedule: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (unschedule) {
        const { error } = await supabase
          .from('scheduled_reviews' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId)
          .eq('is_completed', false);
        if (error) throw error;
      } else {
        const today = new Date();
        const rows = [
          { interval_label: '1 day', due_date: addDays(today, 1) },
          { interval_label: '1 week', due_date: addDays(today, 7) },
          { interval_label: '1 month', due_date: addDays(today, 30) },
        ].map(r => ({
          user_id: user.id,
          card_id: cardId,
          interval_label: r.interval_label,
          due_date: r.due_date,
          is_completed: false,
        }));

        const { error } = await supabase
          .from('scheduled_reviews' as any)
          .upsert(rows as any, { onConflict: 'user_id,card_id,interval_label' });
        if (error) throw error;
      }
    },
    onSuccess: (_, { unschedule }) => {
      toast.success(unschedule ? 'Card removed from review schedule' : 'Card added to your review schedule (1 day, 1 week, 1 month)');
      qc.invalidateQueries({ queryKey: ['scheduled-reviews'] });
    },
    onError: () => toast.error('Failed to update schedule'),
  });
}

// ─── useDueReviews ─────────────────────────────────────────────
export function useDueReviews() {
  const { user } = useAuthContext();
  const today = formatDate(new Date());

  return useQuery({
    queryKey: ['scheduled-reviews', 'due', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reviews' as any)
        .select('id, card_id, due_date, interval_label')
        .eq('user_id', user!.id)
        .eq('is_completed', false)
        .lte('due_date', today);
      if (error) throw error;

      const reviews = data as any[];
      if (!reviews.length) return [];

      const cardIds = [...new Set(reviews.map((r: any) => r.card_id))];
      const { data: resources, error: resErr } = await supabase
        .from('study_resources')
        .select('id, title, content, chapter_id, module_id')
        .in('id', cardIds)
        .eq('is_deleted', false);
      if (resErr) throw resErr;

      const chapterIds = [...new Set((resources || []).map(r => r.chapter_id).filter(Boolean))];
      let chaptersMap: Record<string, string> = {};
      if (chapterIds.length) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id, title')
          .in('id', chapterIds);
        chaptersMap = Object.fromEntries((chapters || []).map(c => [c.id, c.title]));
      }

      const resourceMap = Object.fromEntries((resources || []).map(r => [r.id, r]));

      return reviews
        .filter((r: any) => resourceMap[r.card_id])
        .map((r: any) => {
          const res = resourceMap[r.card_id];
          return {
            reviewId: r.id,
            cardId: r.card_id,
            dueDate: r.due_date,
            intervalLabel: r.interval_label,
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

// ─── useDueReviewCount ─────────────────────────────────────────
export function useDueReviewCount() {
  const { user } = useAuthContext();
  const today = formatDate(new Date());

  return useQuery({
    queryKey: ['scheduled-reviews', 'due-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scheduled_reviews' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_completed', false)
        .lte('due_date', today);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

// ─── useUpcomingReviewCounts ───────────────────────────────────
export function useUpcomingReviewCounts() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['scheduled-reviews', 'upcoming', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reviews' as any)
        .select('due_date')
        .eq('user_id', user!.id)
        .eq('is_completed', false);
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDaysDate(today, 1);
      const in7 = addDaysDate(today, 7);
      const in30 = addDaysDate(today, 30);

      let tomorrowCount = 0, week = 0, month = 0;
      for (const row of (data as any[]) || []) {
        const d = new Date(row.due_date + 'T00:00:00');
        if (d.getTime() === tomorrow.getTime()) tomorrowCount++;
        else if (d > today && d <= in7) week++;
        else if (d > in7 && d <= in30) month++;
      }
      return { tomorrow: tomorrowCount, inWeek: week, inMonth: month };
    },
    staleTime: 60_000,
  });
}

// ─── useMarkReviewsComplete ────────────────────────────────────
export function useMarkReviewsComplete() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase
        .from('scheduled_reviews' as any)
        .update({ is_completed: true } as any)
        .in('id', reviewIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-reviews'] });
    },
  });
}

// ─── useIsCardScheduled ────────────────────────────────────────
export function useIsCardScheduled(cardId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['scheduled-reviews', 'is-scheduled', cardId, user?.id],
    enabled: !!user && !!cardId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scheduled_reviews' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('card_id', cardId!)
        .eq('is_completed', false);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 30_000,
  });
}

// ─── helpers ───────────────────────────────────────────────────
function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function addDaysDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
