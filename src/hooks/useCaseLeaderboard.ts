import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  best_score: number;
  user_id: string;
}

export function useCaseLeaderboard(caseId?: string) {
  return useQuery({
    queryKey: ['case-leaderboard', caseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_case_leaderboard', {
        p_case_id: caseId!,
      });
      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    enabled: !!caseId,
  });
}
