import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useScheduledReviewTotalCount() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['scheduled-reviews', 'total-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scheduled_reviews' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_completed', false);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}
