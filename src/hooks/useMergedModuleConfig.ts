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

/**
 * Build a chapter-id → effective-module-id map.
 * Guest-module chapters are remapped to the host module when merged mode is ON.
 * Returns undefined when config is absent/disabled (no remapping needed).
 */
export function buildEffectiveModuleMap(
  chapters: { id: string; module_id: string }[],
  config: MergedModuleConfig | null | undefined
): Map<string, string> | undefined {
  if (!config?.enabled) return undefined;

  // Build reverse lookup: guestModuleId → hostModuleId
  const guestToHost = new Map<string, string>();
  for (const [hostId, guestIds] of Object.entries(config.chapterMerge)) {
    for (const guestId of guestIds) {
      guestToHost.set(guestId, hostId);
    }
  }

  // Only create map if there are actual remappings needed
  if (guestToHost.size === 0) return undefined;

  const effectiveMap = new Map<string, string>();
  for (const ch of chapters) {
    const host = guestToHost.get(ch.module_id);
    effectiveMap.set(ch.id, host ?? ch.module_id);
  }
  return effectiveMap;
}

/**
 * Get the effective module id for a chapter, falling back to the raw module_id.
 */
export function getEffectiveModuleId(
  chapterId: string,
  rawModuleId: string,
  effectiveMap: Map<string, string> | undefined
): string {
  if (!effectiveMap) return rawModuleId;
  return effectiveMap.get(chapterId) ?? rawModuleId;
}
