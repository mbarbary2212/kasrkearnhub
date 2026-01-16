import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { type ReadinessResult, getEmptyReadinessResult } from '@/lib/readinessCalculator';

interface CachedReadinessData {
  id: string;
  user_id: string;
  module_id: string;
  coverage_score: number;
  performance_score: number;
  improvement_score: number;
  consistency_score: number;
  exam_readiness: number;
  cap_type: string | null;
  raw_score: number;
  last_calculated_at: string;
}

/**
 * Hook to fetch cached readiness data from the database.
 * Falls back to live calculation if cache is stale or missing.
 */
export function useCachedReadiness(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['cached-readiness', moduleId, user?.id],
    queryFn: async (): Promise<CachedReadinessData | null> => {
      if (!user?.id || !moduleId) return null;

      const { data, error } = await supabase
        .from('student_readiness_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .single();

      if (error) {
        // PGRST116 means no rows found - not an actual error
        if (error.code !== 'PGRST116') {
          console.error('Error fetching cached readiness:', error);
        }
        return null;
      }

      return data;
    },
    enabled: !!user?.id && !!moduleId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to refresh the readiness cache via edge function.
 */
export function useRefreshReadinessCache() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ moduleId, forceRecalculate = false }: { 
      moduleId: string; 
      forceRecalculate?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('cache-readiness', {
        body: {
          userId: user.id,
          moduleId,
          forceRecalculate,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the cached readiness query
      queryClient.invalidateQueries({ 
        queryKey: ['cached-readiness', variables.moduleId] 
      });
      // Also invalidate the student dashboard to pick up new data
      queryClient.invalidateQueries({ 
        queryKey: ['student-dashboard'] 
      });
    },
  });
}

/**
 * Convert cached data to ReadinessResult format.
 */
export function cachedDataToReadinessResult(cached: CachedReadinessData | null): ReadinessResult {
  if (!cached) return getEmptyReadinessResult();

  return {
    examReadiness: cached.exam_readiness,
    components: {
      coverage: cached.coverage_score,
      performance: cached.performance_score,
      improvement: cached.improvement_score,
      consistency: cached.consistency_score,
    },
    cap: cached.cap_type ? {
      type: cached.cap_type as 'coverage' | 'performance' | 'improvement',
      threshold: getCapThreshold(cached.cap_type),
      maxReadiness: cached.exam_readiness,
    } : null,
    rawScore: cached.raw_score,
    breakdown: {
      coverageContribution: Math.round(cached.coverage_score * 0.40),
      performanceContribution: Math.round(cached.performance_score * 0.30),
      improvementContribution: Math.round(cached.improvement_score * 0.20),
      consistencyContribution: Math.round(cached.consistency_score * 0.10),
    },
  };
}

function getCapThreshold(capType: string): number {
  switch (capType) {
    case 'coverage': return 40;
    case 'performance': return 50;
    case 'improvement': return 40;
    default: return 0;
  }
}
