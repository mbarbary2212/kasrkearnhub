import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Check if the platform disclaimer is enabled and needs to be shown */
export function useDisclaimerEnabled() {
  return useQuery({
    queryKey: ['study-settings', 'platform_disclaimer_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .in('key', ['platform_disclaimer_enabled', 'platform_disclaimer_version']);

      if (error) {
        console.warn('[DisclaimerSetting] Error fetching setting:', error.message);
        return false;
      }

      const enabledRow = data?.find(r => r.key === 'platform_disclaimer_enabled');
      const versionRow = data?.find(r => r.key === 'platform_disclaimer_version');

      const enabled = enabledRow?.value?.toString().trim().toLowerCase() === 'true';
      if (!enabled) return false;

      // Check if user accepted the current version
      const serverVersion = versionRow?.value || '0';
      const acceptedVersion = localStorage.getItem('kalm_disclaimer_version');

      // If server version differs from what user accepted, they need to re-accept
      if (acceptedVersion !== serverVersion) {
        localStorage.removeItem('kalm_disclaimer_accepted');
        return true;
      }

      return true;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function getDisclaimerVersion(): string | null {
  return localStorage.getItem('kalm_disclaimer_version');
}
