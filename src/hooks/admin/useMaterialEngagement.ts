import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MaterialKind = 'videos' | 'mcqs' | 'chapters';

export interface VideoEngagementRow {
  material_id: string;
  title: string;
  module_id: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  unique_viewers: number;
  total_views: number;
  avg_percent_watched: number;
  completion_rate: number;
  last_viewed_at: string | null;
}

export interface McqEngagementRow {
  material_id: string;
  stem: string;
  module_id: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  unique_users: number;
  total_attempts: number;
  accuracy: number;
  avg_time_seconds: number;
  last_attempted_at: string | null;
}

export interface ChapterEngagementRow {
  chapter_id: string;
  chapter_title: string;
  module_id: string | null;
  unique_students: number;
  total_minutes: number;
  avg_minutes_per_student: number;
  last_activity_at: string | null;
}

export function useMaterialEngagement<T = unknown>(
  kind: MaterialKind,
  moduleId: string | null,
  days: number,
  enrolledStudents: number,
) {
  return useQuery({
    queryKey: ['material-engagement', kind, moduleId, days],
    staleTime: 60_000,
    queryFn: async () => {
      const fnName =
        kind === 'videos'
          ? 'admin_material_engagement_videos'
          : kind === 'mcqs'
            ? 'admin_material_engagement_mcqs'
            : 'admin_material_engagement_chapters';
      const { data, error } = await supabase.rpc(fnName as any, {
        p_module_id: moduleId,
        p_days: days,
      });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: enrolledStudents >= 0,
  });
}

/** Returns count of distinct students who have ANY activity in the last `days`. Used as the "reach denominator". */
export function useEnrolledStudentCount(days: number) {
  return useQuery({
    queryKey: ['enrolled-students-active', days],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('study_time_events' as any)
        .select('user_id')
        .gte('session_date', since.toISOString().split('T')[0]);
      if (error || !data) return 0;
      const uniq = new Set((data as any[]).map(r => r.user_id));
      return uniq.size;
    },
  });
}

export type EngagementStatus = 'working' | 'abandoned' | 'ignored' | 'unused' | 'confusing';

export function classifyVideo(row: VideoEngagementRow, totalStudents: number): EngagementStatus {
  if (row.unique_viewers === 0) return 'unused';
  const reach = totalStudents > 0 ? (row.unique_viewers / totalStudents) * 100 : 0;
  if (reach >= 60 && row.completion_rate >= 70) return 'working';
  if (reach >= 40 && row.completion_rate < 40) return 'abandoned';
  if (reach < 20) return 'ignored';
  return 'working';
}

export function classifyMcq(row: McqEngagementRow, totalStudents: number, medianTime: number): EngagementStatus {
  if (row.unique_users === 0) return 'unused';
  const reach = totalStudents > 0 ? (row.unique_users / totalStudents) * 100 : 0;
  if (medianTime > 0 && row.avg_time_seconds > 2 * medianTime && row.accuracy < 40) return 'confusing';
  if (reach >= 60 && row.accuracy >= 50 && row.accuracy <= 90) return 'working';
  if (reach >= 40 && row.total_attempts > 0 && row.accuracy < 40) return 'abandoned';
  if (reach < 20) return 'ignored';
  return 'working';
}

export const STATUS_LABELS: Record<EngagementStatus, { label: string; className: string; emoji: string }> = {
  working: { label: 'Working', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', emoji: '🟢' },
  abandoned: { label: 'Abandoned', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', emoji: '🟡' },
  ignored: { label: 'Ignored', className: 'bg-destructive/10 text-destructive', emoji: '🔴' },
  unused: { label: 'Unused', className: 'bg-muted text-muted-foreground', emoji: '⚪' },
  confusing: { label: 'Confusing', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', emoji: '⚠️' },
};