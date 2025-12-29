import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaseScenario {
  id: string;
  title: string;
  case_history: string;
  case_questions: string;
  model_answer: string;
  rating: number | null;
  chapter_id: string | null;
  module_id: string | null;
  display_order: number | null;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
}

export interface CaseScenarioInsert {
  title: string;
  case_history: string;
  case_questions: string;
  model_answer: string;
  rating?: number | null;
  chapter_id: string;
  module_id: string;
}

// Fetch case scenarios for a chapter (optionally include deleted)
export function useChapterCaseScenarios(chapterId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['chapter-case-scenarios', chapterId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('case_scenarios')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseScenario[];
    },
    enabled: !!chapterId,
  });
}

// Create a case scenario
export function useCreateCaseScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CaseScenarioInsert) => {
      const { data: result, error } = await supabase
        .from('case_scenarios')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', variables.chapter_id] });
    },
  });
}

// Update a case scenario
export function useUpdateCaseScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CaseScenarioInsert> }) => {
      const { data: result, error } = await supabase
        .from('case_scenarios')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', result.chapter_id] });
    },
  });
}

// Delete (soft delete) a case scenario
export function useDeleteCaseScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chapterId }: { id: string; chapterId: string }) => {
      const { error } = await supabase
        .from('case_scenarios')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      return { id, chapterId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', variables.chapterId, false] });
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', variables.chapterId, true] });
    },
  });
}

// Restore (undo soft delete) a case scenario
export function useRestoreCaseScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chapterId }: { id: string; chapterId: string }) => {
      const { error } = await supabase
        .from('case_scenarios')
        .update({ is_deleted: false })
        .eq('id', id);

      if (error) throw error;
      return { id, chapterId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', variables.chapterId, false] });
      queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', variables.chapterId, true] });
    },
  });
}

// Bulk create case scenarios
export function useBulkCreateCaseScenarios() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CaseScenarioInsert[]) => {
      const { data: result, error } = await supabase
        .from('case_scenarios')
        .insert(data)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      if (result && result.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['chapter-case-scenarios', result[0].chapter_id] });
      }
    },
  });
}
