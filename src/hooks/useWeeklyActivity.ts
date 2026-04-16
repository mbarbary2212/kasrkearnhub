import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useWeeklyActivity() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['weekly-activity', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('question_attempts')
        .select('created_at')
        .eq('user_id', user!.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;

      const activeDates = new Set(
        (data ?? []).map(a => (a.created_at as string).split('T')[0])
      );
      return activeDates;
    },
    staleTime: 60_000,
  });
}
