import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MergedModuleDisplay {
  displayName: string;
  tags: string[];
}

export interface MergedModuleConfig {
  enabled: boolean;
  hiddenModules: string[];
  display: Record<string, MergedModuleDisplay>;
  chapterMerge: Record<string, string[]>;
}

/**
 * Reads the merged_surgery_config from the study_settings table.
 * Returns null when config is absent, invalid, or disabled.
 */
export function useMergedModuleConfig() {
  return useQuery({
    queryKey: ['study-settings', 'merged_surgery_config'],
    queryFn: async (): Promise<MergedModuleConfig | null> => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', 'merged_surgery_config')
        .maybeSingle();

      if (error || !data?.value) return null;

      try {
        const parsed: MergedModuleConfig = JSON.parse(data.value);

        // Validate shape
        if (
          typeof parsed !== 'object' ||
          typeof parsed.enabled !== 'boolean' ||
          !Array.isArray(parsed.hiddenModules) ||
          typeof parsed.display !== 'object' ||
          typeof parsed.chapterMerge !== 'object'
        ) {
          console.warn('[useMergedModuleConfig] Invalid config shape, returning null');
          return null;
        }

        if (!parsed.enabled) return null;

        return parsed;
      } catch (e) {
        console.warn('[useMergedModuleConfig] Failed to parse config:', e);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Helper to expand moduleIds with merged guest modules.
 * Returns deduplicated array.
 */
export function expandModuleIds(
  moduleIds: string[],
  config: MergedModuleConfig | null | undefined
): string[] {
  if (!config?.enabled) return moduleIds;

  const expanded = [...moduleIds];
  for (const [hostId, guestIds] of Object.entries(config.chapterMerge)) {
    if (expanded.includes(hostId)) {
      for (const guestId of guestIds) {
        if (!expanded.includes(guestId)) {
          expanded.push(guestId);
        }
      }
    }
  }
  return expanded;
}
