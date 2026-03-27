import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classifyByModule, type ChapterMetricRow, type ModuleClassification } from '@/lib/classifyChapters';

/**
 * Fetches student_chapter_metrics for the current user and runs Algorithm v1.
 * Optionally filter to a single module.
 */
export function useChapterClassification(userId: string | undefined, moduleId?: string) {
  return useQuery<ModuleClassification[]>({
    queryKey: ['chapter-classification', userId, moduleId],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('student_chapter_metrics' as any)
        .select('student_id, module_id, chapter_id, readiness_score, recent_mcq_accuracy, mcq_attempts, next_review_at, overconfident_error_rate')
        .eq('student_id', userId);

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows: ChapterMetricRow[] = (data || []).map((r: any) => ({
        student_id: r.student_id,
        module_id: r.module_id,
        chapter_id: r.chapter_id,
        readiness_score: r.readiness_score,
        recent_mcq_accuracy: r.recent_mcq_accuracy,
        mcq_attempts: r.mcq_attempts,
        next_review_at: r.next_review_at,
        overconfident_error_rate: r.overconfident_error_rate,
      }));

      return classifyByModule(rows);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
