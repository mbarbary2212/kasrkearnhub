import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CaseScenario, CaseScenarioQuestion } from '@/types/caseScenario';

/** Lightweight count hook for chapter case scenarios (badges) */
export function useChapterCaseScenarioCount(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', 'chapter-count', chapterId],
    queryFn: async () => {
      if (!chapterId) return 0;
      const { count, error } = await supabase
        .from('case_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
        .eq('is_deleted', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
  });
}

/** Fetch case scenarios for a chapter (with embedded questions) */
export function useCaseScenarios(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];

      const { data, error } = await supabase
        .from('case_scenarios')
        .select(`
          *,
          questions:case_scenario_questions(*),
          chapter:module_chapters(title, chapter_number),
          topic:topics(name),
          module:modules(name)
        `)
        .eq('chapter_id', chapterId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return (data ?? []) as unknown as CaseScenario[];
    },
    enabled: !!chapterId,
  });
}

/** Fetch case scenarios by difficulty for a set of chapter IDs (for exam generation context) */
export function useCaseScenarioPool(chapterIds: string[], difficulty?: string) {
  return useQuery({
    queryKey: ['case-scenario-pool', chapterIds, difficulty],
    queryFn: async () => {
      let query = supabase
        .from('case_scenarios')
        .select(`
          *,
          questions:case_scenario_questions(*)
        `)
        .in('chapter_id', chapterIds)
        .eq('is_deleted', false);

      if (difficulty) {
        query = query.eq('difficulty', difficulty as 'easy' | 'moderate' | 'difficult');
      }

      const { data, error } = await query.order('display_order');
      if (error) throw error;
      return (data ?? []) as unknown as CaseScenario[];
    },
    enabled: chapterIds.length > 0,
  });
}

/** Fetch a single case scenario with questions */
export function useCaseScenarioDetail(caseId?: string) {
  return useQuery({
    queryKey: ['case-scenario', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenarios')
        .select(`
          *,
          questions:case_scenario_questions(*),
          chapter:module_chapters(title, chapter_number),
          topic:topics(name),
          module:modules(name)
        `)
        .eq('id', caseId!)
        .single();

      if (error) throw error;
      return data as unknown as CaseScenario;
    },
    enabled: !!caseId,
  });
}

/** Soft-delete a case scenario */
export function useDeleteCaseScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('case_scenarios')
        .update({ is_deleted: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-scenarios'] });
      qc.invalidateQueries({ queryKey: ['case-scenario-pool'] });
    },
  });
}
