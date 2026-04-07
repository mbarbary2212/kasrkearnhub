import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import type { TabWithCount } from '@/config/tabConfig';

// ── DB module_key → tabConfig tab id mapping ──
export const MODULE_KEY_TO_TAB_ID: Record<string, string> = {
  videos: 'lectures',
  flashcards: 'flashcards',
  visual_resources: 'mind_maps',
  socrates: 'guided_explanations',
  reference_materials: 'reference_materials',
  clinical_tools: 'clinical_tools',
  cases: 'cases',
  pathways: 'pathways',
  mcq: 'mcqs',
  sba: 'sba',
  true_false: 'true_false',
  short_answer: 'essays',
  osce: 'osce',
  practical: 'practical',
  matching: 'matching',
  image_questions: 'images',
};

// Reverse: tab id → module_key
export const TAB_ID_TO_MODULE_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_KEY_TO_TAB_ID).map(([k, v]) => [v, k])
);

// ── Types ──
export interface ModulePinSetting {
  id: string;
  module_key: string;
  is_pinned: boolean;
  pinned_by: string | null;
  updated_at: string;
}

export interface StudentModulePreference {
  id: string;
  user_id: string;
  module_key: string;
  is_hidden: boolean;
  updated_at: string;
}

// ── Module groups for UI display ──
export const MODULE_GROUPS = [
  {
    label: 'Resources',
    keys: ['videos', 'flashcards', 'visual_resources', 'socrates', 'reference_materials', 'clinical_tools'],
  },
  {
    label: 'Interactive',
    keys: ['cases', 'pathways'],
  },
  {
    label: 'Practice',
    keys: ['mcq', 'sba', 'true_false', 'short_answer', 'osce', 'practical', 'matching', 'image_questions'],
  },
];

export const MODULE_KEY_LABELS: Record<string, string> = {
  videos: 'Videos',
  flashcards: 'Flashcards',
  visual_resources: 'Visual Resources',
  socrates: 'Socrates',
  reference_materials: 'Reference Materials',
  clinical_tools: 'Clinical Tools',
  cases: 'Cases',
  pathways: 'Pathways',
  mcq: 'MCQ',
  sba: 'SBA',
  true_false: 'True/False',
  short_answer: 'Short Questions',
  osce: 'OSCE',
  practical: 'Practical',
  matching: 'Matching',
  image_questions: 'Image Questions',
};

// ── Hooks ──

const PIN_SETTINGS_KEY = ['module-pin-settings'] as const;
const STUDENT_PREFS_KEY = ['student-module-preferences'] as const;

export function useModulePinSettings() {
  return useQuery({
    queryKey: PIN_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_pin_settings')
        .select('*');
      if (error) throw error;
      return data as ModulePinSetting[];
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useStudentModulePreferences() {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: [...STUDENT_PREFS_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('student_module_preferences')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as StudentModulePreference[];
    },
    enabled: !!user?.id,
  });
}

export function useUpsertPinSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ module_key, is_pinned, pinned_by }: { module_key: string; is_pinned: boolean; pinned_by: string }) => {
      const { error } = await supabase
        .from('module_pin_settings')
        .update({ is_pinned, pinned_by, updated_at: new Date().toISOString() })
        .eq('module_key', module_key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIN_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: STUDENT_PREFS_KEY });
    },
  });
}

export function useUpsertStudentPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: async ({ module_key, is_hidden }: { module_key: string; is_hidden: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('student_module_preferences')
        .upsert(
          { user_id: user.id, module_key, is_hidden, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,module_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_PREFS_KEY });
    },
  });
}

// ── Filtering helper ──
export function filterByCustomPrefs(
  tabs: TabWithCount[],
  pinSettings: ModulePinSetting[] | undefined,
  studentPrefs: StudentModulePreference[] | undefined
): TabWithCount[] {
  if (!pinSettings) return tabs;
  return tabs.filter(tab => {
    const moduleKey = TAB_ID_TO_MODULE_KEY[tab.id];
    if (!moduleKey) return true; // unknown tab → show
    const pin = pinSettings.find(p => p.module_key === moduleKey);
    if (pin?.is_pinned) return true; // pinned → always show
    const pref = studentPrefs?.find(p => p.module_key === moduleKey);
    if (pref?.is_hidden) return false; // hidden by student
    return true; // default visible
  });
}
