import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface WeeklyStudySummary {
  totalSeconds: number;
  byActivity: {
    reading: number;
    watching: number;
    practicing: number;
    cases: number;
  };
  chaptersTouched: number;
  topChapter: { chapterId: string; title: string; seconds: number } | null;
}

/**
 * Aggregates `study_time_events` for the last 7 days for the current user.
 * Returns total seconds, split by activity type, count of distinct chapters,
 * and the chapter where the most time was spent.
 */
export function useWeeklyStudySummary() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['weekly-study-summary', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<WeeklyStudySummary> => {
      const empty: WeeklyStudySummary = {
        totalSeconds: 0,
        byActivity: { reading: 0, watching: 0, practicing: 0, cases: 0 },
        chaptersTouched: 0,
        topChapter: null,
      };
      if (!user?.id) return empty;

      const since = new Date();
      since.setDate(since.getDate() - 6); // last 7 days inclusive
      const sinceDate = since.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('study_time_events' as any)
        .select('chapter_id, activity_type, duration_seconds')
        .eq('user_id', user.id)
        .gte('session_date', sinceDate);

      if (error || !data) return empty;

      const byActivity = { reading: 0, watching: 0, practicing: 0, cases: 0 };
      const byChapter = new Map<string, number>();
      let total = 0;

      for (const row of data as any[]) {
        const secs = row.duration_seconds || 0;
        total += secs;
        if (row.activity_type in byActivity) {
          byActivity[row.activity_type as keyof typeof byActivity] += secs;
        }
        if (row.chapter_id) {
          byChapter.set(row.chapter_id, (byChapter.get(row.chapter_id) || 0) + secs);
        }
      }

      // Find the chapter with the most time
      let topChapterId: string | null = null;
      let topChapterSecs = 0;
      for (const [cid, secs] of byChapter.entries()) {
        if (secs > topChapterSecs) {
          topChapterId = cid;
          topChapterSecs = secs;
        }
      }

      let topChapter: WeeklyStudySummary['topChapter'] = null;
      if (topChapterId) {
        const { data: chap } = await supabase
          .from('module_chapters')
          .select('id, title, module_id')
          .eq('id', topChapterId)
          .maybeSingle();
        topChapter = {
          chapterId: topChapterId,
          moduleId: chap?.module_id ?? null,
          title: chap?.title || 'Chapter',
          seconds: topChapterSecs,
        };
      }

      return {
        totalSeconds: total,
        byActivity,
        chaptersTouched: byChapter.size,
        topChapter,
      };
    },
  });
}