import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StructuredCaseData, SectionType, SECTION_LABELS } from '@/types/structuredCase';

/** Fetch a structured case with its generated_case_data */
export function useStructuredCaseDetail(caseId?: string) {
  return useQuery({
    queryKey: ['structured-case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_cases')
        .select(`
          *,
          module:modules(name),
          chapter:module_chapters(title, chapter_number)
        `)
        .eq('id', caseId!)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!caseId,
  });
}

/** Update generated_case_data and related fields for a structured case */
export function useUpdateStructuredCaseData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      data,
      avatar_id,
      history_interaction_mode,
      active_sections,
    }: {
      caseId: string;
      data: StructuredCaseData;
      avatar_id?: number;
      history_interaction_mode?: string;
      active_sections?: SectionType[];
    }) => {
      const updatePayload: Record<string, unknown> = {
        generated_case_data: data as any,
      };
      if (avatar_id !== undefined) updatePayload.avatar_id = avatar_id;
      if (history_interaction_mode !== undefined) updatePayload.history_interaction_mode = history_interaction_mode;
      if (active_sections !== undefined) updatePayload.active_sections = active_sections;

      const { error } = await supabase
        .from('virtual_patient_cases')
        .update(updatePayload as any)
        .eq('id', caseId);

      if (error) throw error;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['structured-case', caseId] });
    },
  });
}

/** Publish / unpublish a structured case */
export function usePublishStructuredCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, publish }: { caseId: string; publish: boolean }) => {
      const { error } = await supabase
        .from('virtual_patient_cases')
        .update({ is_published: publish })
        .eq('id', caseId);

      if (error) throw error;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['structured-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
    },
  });
}
