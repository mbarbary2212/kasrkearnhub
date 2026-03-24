import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Check if the platform disclaimer is enabled and needs to be shown */
export function useDisclaimerEnabled() {
  return useQuery({
    queryKey: ['study-settings', 'platform_disclaimer_enabled'],
    queryFn: async (): Promise<{ show: boolean; version: string }> => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('key, value')
        .in('key', ['platform_disclaimer_enabled', 'platform_disclaimer_version']);

      if (error) {
        console.warn('[DisclaimerSetting] Error fetching setting:', error.message);
        return { show: false, version: '0' };
      }

      const enabledRow = data?.find(r => r.key === 'platform_disclaimer_enabled');
      const versionRow = data?.find(r => r.key === 'platform_disclaimer_version');

      const enabled = enabledRow?.value?.toString().trim().toLowerCase() === 'true';
      const serverVersion = versionRow?.value || '0';

      if (!enabled) return { show: false, version: serverVersion };

      // Check if user already accepted this specific version
      const acceptedVersion = localStorage.getItem('kalm_disclaimer_version');
      if (acceptedVersion === serverVersion) {
        return { show: false, version: serverVersion };
      }

      return { show: true, version: serverVersion };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function getDisclaimerVersion(): string | null {
  return localStorage.getItem('kalm_disclaimer_version');
}
