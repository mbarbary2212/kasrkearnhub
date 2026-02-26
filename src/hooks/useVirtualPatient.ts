import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VPCase, VPAttempt, VPCaseFormData } from '@/types/virtualPatient';
import { useAuthContext } from '@/contexts/AuthContext';

// Fetch all cases for a module
export function useVirtualPatientCases(moduleId?: string, includeUnpublished = false) {
  return useQuery({
    queryKey: ['virtual-patient-cases', moduleId, includeUnpublished],
    queryFn: async () => {
      let query = supabase
        .from('virtual_patient_cases')
        .select(`
          *,
          module:modules(name),
          chapter:module_chapters(title, chapter_number),
          topic:topics(name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      if (!includeUnpublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as VPCase[];
    },
    enabled: true,
  });
}

// Fetch a single case
export function useVirtualPatientCase(caseId?: string) {
  return useQuery({
    queryKey: ['virtual-patient-case', caseId],
    queryFn: async () => {
      const { data: caseData, error: caseError } = await supabase
        .from('virtual_patient_cases')
        .select(`
          *,
          module:modules(name),
          chapter:module_chapters(title, chapter_number),
          topic:topics(name)
        `)
        .eq('id', caseId!)
        .single();

      if (caseError) throw caseError;
      return caseData as unknown as VPCase;
    },
    enabled: !!caseId,
  });
}

// Create a new case
export function useCreateVirtualPatientCase() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: VPCaseFormData) => {
      const insertData: Record<string, unknown> = {
        ...data,
        is_ai_driven: true,
        created_by: user?.id,
        tags: data.tags || [],
      };
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
    },
  });
}

// Update a case
export function useUpdateVirtualPatientCase() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VPCaseFormData> }) => {
      const updatePayload: Record<string, unknown> = {
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .update(updatePayload as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', variables.id] });
    },
  });
}

// Delete (soft delete) a case
export function useDeleteVirtualPatientCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('virtual_patient_cases')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-cases'] });
    },
  });
}

// User attempts
export function useVirtualPatientAttempts(caseId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['virtual-patient-attempts', caseId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('virtual_patient_attempts')
        .select(`
          *,
          case:virtual_patient_cases(title, level, estimated_minutes)
        `)
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as VPAttempt[];
    },
    enabled: !!user,
  });
}

// Start an attempt
export function useStartVirtualPatientAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ caseId }: { caseId: string }) => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .insert({
          user_id: user!.id,
          case_id: caseId,
          total_stages: 0,
          stage_answers: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-attempts', variables.caseId] });
    },
  });
}

// Complete an attempt
export function useCompleteVirtualPatientAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      caseId,
      timeTakenSeconds,
    }: {
      attemptId: string;
      caseId: string;
      timeTakenSeconds: number;
    }) => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          time_taken_seconds: timeTakenSeconds,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-attempts', variables.caseId] });
    },
  });
}
