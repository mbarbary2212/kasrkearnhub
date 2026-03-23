import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Check if the platform disclaimer is enabled by admin */
export function useDisclaimerEnabled() {
  return useQuery({
    queryKey: ['study-settings', 'platform_disclaimer_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', 'platform_disclaimer_enabled')
        .maybeSingle();

      if (error) throw error;
      return data?.value === 'true';
    },
    staleTime: 5 * 60 * 1000,
  });
}
