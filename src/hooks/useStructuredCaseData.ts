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

/** Update generated_case_data for a structured case */
export function useUpdateStructuredCaseData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, data }: { caseId: string; data: StructuredCaseData }) => {
      const { error } = await supabase
        .from('virtual_patient_cases')
        .update({ generated_case_data: data as any })
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
