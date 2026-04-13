import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

// Re-export legacy classifier (deprecated) for backward compat
/** @deprecated Use classifyFromMetrics from '@/lib/readiness' instead */
export { classifyChapterState, getModuleStatusFromMetrics } from '@/lib/studentMetrics';
export type { ChapterState, ChapterMetricsInput } from '@/lib/studentMetrics';

// Re-export new canonical classifier
export { classifyFromMetrics } from '@/lib/readiness';
export type { ChapterStatus } from '@/lib/readiness';

export interface StudentChapterMetric {
  id: string;
  student_id: string;
  module_id: string;
  chapter_id: string;
  coverage_percent: number;
  videos_completed: number;
  videos_total: number;
  resources_viewed: number;
  mcq_attempts: number;
  mcq_correct: number;
  mcq_wrong: number;
  mcq_accuracy: number;
  recent_mcq_accuracy: number;
  flashcards_due: number;
  flashcards_overdue: number;
  minutes_reading: number;
  minutes_watching: number;
  minutes_practicing: number;
  minutes_total: number;
  last_activity_at: string | null;
  last_video_at: string | null;
  last_mcq_attempt_at: string | null;
  last_flashcard_review_at: string | null;
  readiness_score: number;
  // Confidence-derived fields
  confidence_avg: number;
  confidence_mismatch_rate: number;
  overconfident_error_rate: number;
  underconfident_correct_rate: number;
  // Review scheduling fields
  next_review_at: string | null;
  last_review_interval: number;
  review_strength: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch per-chapter metrics for the current student.
 * Optionally filtered by module.
 */
export function useStudentChapterMetrics(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['student-chapter-metrics', user?.id, moduleId],
    queryFn: async (): Promise<StudentChapterMetric[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('student_chapter_metrics' as any)
        .select('*')
        .eq('student_id', user.id);

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching chapter metrics:', error);
        return [];
      }

      return (data || []) as unknown as StudentChapterMetric[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}
