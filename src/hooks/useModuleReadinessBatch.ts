import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ModuleReadinessEntry {
  module_id: string;
  exam_readiness: number;
}

/**
 * Fetch readiness scores for multiple modules in a single query.
 * Tries `student_readiness_cache` first; if empty, falls back to
 * aggregating avg(readiness_score) from `student_chapter_metrics`.
 * Returns a map of module_id → exam_readiness (0-100).
 */
export function useModuleReadinessBatch(moduleIds: string[]) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['module-readiness-batch', user?.id, moduleIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user?.id || moduleIds.length === 0) return {};

      // 1. Try the cache first
      const { data: cacheData, error: cacheError } = await supabase
        .from('student_readiness_cache')
        .select('module_id, exam_readiness')
        .eq('user_id', user.id)
        .in('module_id', moduleIds);

      if (!cacheError && cacheData && cacheData.length > 0) {
        const map: Record<string, number> = {};
        for (const row of cacheData) {
          map[row.module_id] = Math.round(row.exam_readiness);
        }
        // If cache covers all requested modules, return immediately
        if (Object.keys(map).length >= moduleIds.length) return map;

        // Otherwise, find missing modules and fill from metrics
        const missingIds = moduleIds.filter((id) => !(id in map));
        if (missingIds.length > 0) {
          const fallback = await fetchReadinessFromMetrics(user.id, missingIds);
          Object.assign(map, fallback);
        }
        return map;
      }

      // 2. Cache empty/error — fall back to student_chapter_metrics
      return fetchReadinessFromMetrics(user.id, moduleIds);
    },
    enabled: !!user?.id && moduleIds.length > 0,
    staleTime: 60000,
  });
}

/**
 * Aggregate avg readiness_score per module from student_chapter_metrics.
 */
async function fetchReadinessFromMetrics(
  userId: string,
  moduleIds: string[],
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('student_chapter_metrics' as any)
    .select('module_id, readiness_score')
    .eq('student_id', userId)
    .in('module_id', moduleIds);

  if (error) {
    console.error('Error fetching readiness from metrics:', error);
    return {};
  }

  // Group by module and compute average
  const groups: Record<string, number[]> = {};
  for (const row of (data || []) as any[]) {
    const mid = row.module_id as string;
    if (!groups[mid]) groups[mid] = [];
    groups[mid].push(Number(row.readiness_score) || 0);
  }

  const map: Record<string, number> = {};
  for (const [mid, scores] of Object.entries(groups)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    map[mid] = Math.round(avg);
  }
  return map;
}
