import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ModuleReadinessEntry {
  module_id: string;
  exam_readiness: number;
}

/**
 * Fetch cached readiness scores for multiple modules in a single query.
 * Returns a map of module_id → exam_readiness (0-100).
 */
export function useModuleReadinessBatch(moduleIds: string[]) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['module-readiness-batch', user?.id, moduleIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user?.id || moduleIds.length === 0) return {};

      const { data, error } = await supabase
        .from('student_readiness_cache')
        .select('module_id, exam_readiness')
        .eq('user_id', user.id)
        .in('module_id', moduleIds);

      if (error) {
        console.error('Error fetching batch readiness:', error);
        return {};
      }

      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[row.module_id] = Math.round(row.exam_readiness);
      }
      return map;
    },
    enabled: !!user?.id && moduleIds.length > 0,
    staleTime: 60000,
  });
}
