import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { StructuredCaseFormData } from '@/types/structuredCase';

/** Create a new structured case (saves metadata — no AI generation yet) */
export function useCreateStructuredCase() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: StructuredCaseFormData) => {
      const insertPayload: Record<string, unknown> = {
        title: data.title,
        intro_text: data.chief_complaint,
        chief_complaint: data.chief_complaint,
        module_id: data.module_id,
        chapter_id: data.chapter_id || null,
        level: data.level,
        estimated_minutes: data.estimated_minutes,
        additional_instructions: data.additional_instructions || null,
        tags: data.tags || [],
        active_sections: data.active_sections,
        section_question_counts: data.section_question_counts || {},
        history_mode: data.history_mode,
        patient_language: data.patient_language,
        delivery_mode: data.delivery_mode,
        is_ai_driven: true,
        is_published: false,
        is_deleted: false,
        max_turns: 10,
        created_by: user?.id,
        avatar_id: data.avatar_id,
      };

      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .insert(insertPayload as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
    },
  });
}

/** Generate structured case content via AI edge function */
export function useGenerateStructuredCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-structured-case', {
        body: { case_id: caseId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
    },
  });
}
