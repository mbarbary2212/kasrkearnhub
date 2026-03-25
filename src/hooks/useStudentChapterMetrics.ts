import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

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
  created_at: string;
  updated_at: string;
}

export type ChapterState = 'not_started' | 'early' | 'weak' | 'unstable' | 'strong' | 'in_progress';

/**
 * Derive chapter learning state from per-chapter metrics.
 */
export function getChapterState(m: StudentChapterMetric): ChapterState {
  if (m.coverage_percent === 0 && m.mcq_attempts < 3) return 'not_started';
  if (m.coverage_percent < 40 && m.mcq_attempts < 5) return 'early';
  if (m.mcq_attempts >= 5 && m.recent_mcq_accuracy < 60) return 'weak';
  if (m.mcq_attempts >= 5 && m.recent_mcq_accuracy >= 60 && m.recent_mcq_accuracy < 75) return 'unstable';
  if (m.readiness_score >= 75) return 'strong';
  return 'in_progress';
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
    staleTime: 30000, // 30 seconds
  });
}
