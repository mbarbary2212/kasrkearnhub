import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface LastPosition {
  year_number: number | null;
  module_id: string | null;
  module_name: string | null;
  module_slug: string | null;
  book_label: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  tab: string | null;
  activity_position: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * Read the student's last saved navigation position.
 */
export function useLastPosition() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['last-position', user?.id],
    queryFn: async (): Promise<LastPosition | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('student_last_position')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last position:', error);
        return null;
      }

      return data as LastPosition | null;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Save the student's current navigation position.
 * Call this from pages when the user navigates to a new location.
 */
export function useSaveLastPosition() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pos: Partial<Omit<LastPosition, 'updated_at'>>) => {
      if (!user?.id) return;

      const payload = {
        user_id: user.id,
        year_number: pos.year_number ?? null,
        module_id: pos.module_id ?? null,
        module_name: pos.module_name ?? null,
        module_slug: pos.module_slug ?? null,
        book_label: pos.book_label ?? null,
        chapter_id: pos.chapter_id ?? null,
        chapter_title: pos.chapter_title ?? null,
        tab: pos.tab ?? null,
        activity_position: pos.activity_position ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('student_last_position')
        .upsert(payload as any, { onConflict: 'user_id' });

      if (error) console.error('Error saving last position:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['last-position', user?.id] });
    },
  });
}

/**
 * Build the resume URL from a LastPosition object.
 */
export function buildResumeUrl(pos: LastPosition): string {
  // If we have a chapter, go to the chapter with the right tab
  if (pos.chapter_id && pos.module_id) {
    const tab = pos.tab || 'resources';
    let url = `/module/${pos.module_id}/chapter/${pos.chapter_id}?section=${tab}`;
    const subTab = pos.activity_position?.sub_tab;
    if (subTab && typeof subTab === 'string') {
      url += `&subtab=${subTab}`;
    }
    const itemIndex = pos.activity_position?.item_index;
    if (itemIndex !== undefined && itemIndex !== null && typeof itemIndex === 'number') {
      url += `&item_index=${itemIndex}`;
    }
    return url;
  }

  // If we have a module, go to module page
  if (pos.module_id) {
    return `/module/${pos.module_id}`;
  }

  // If we have a year, go to all years page
  if (pos.year_number) {
    return `/years`;
  }

  return '/';
}

/**
 * Build a human-readable label for where the student was.
 */
export function buildResumeLabel(pos: LastPosition): string {
  const parts: string[] = [];

  if (pos.module_slug) parts.push(pos.module_slug.toUpperCase());
  if (pos.chapter_title) parts.push(pos.chapter_title);
  if (pos.tab) {
    const tabLabels: Record<string, string> = {
      resources: 'Resources',
      interactive: 'Interactive',
      practice: 'Practice',
      'test-yourself': 'Test Yourself',
    };
    parts.push(tabLabels[pos.tab] || pos.tab);
  }

  if (pos.activity_position) {
    const ap = pos.activity_position;
    if (ap.sub_tab && typeof ap.sub_tab === 'string') {
      const subTabLabels: Record<string, string> = {
        lectures: 'Videos',
        flashcards: 'Flashcards',
        mind_maps: 'Visual Resources',
        guided_explanations: 'Socrates',
        reference_materials: 'Reference Materials',
        clinical_tools: 'Clinical Tools',
        cases: 'Cases',
        pathways: 'Pathways',
        mcqs: 'MCQs',
        sba: 'SBA',
        true_false: 'True/False',
        essays: 'Short Essay',
        osce: 'OSCE',
        practical: 'Practical',
        matching: 'Matching',
        images: 'Image Questions',
      };
      parts.push(subTabLabels[ap.sub_tab] || ap.sub_tab);
    }
    // Show specific item info if available
    if (ap.item_label && typeof ap.item_label === 'string') {
      parts.push(ap.item_label);
    }
  }

  return parts.join(' → ');
}
