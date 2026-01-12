import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VPCase, VPStage, VPAttempt, VPCaseFormData, VPStageFormData, StageAnswer } from '@/types/virtualPatient';
import { useAuthContext } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

// Fetch all cases for a module (student view - published only)
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

      // Get stage counts
      const caseIds = data?.map(c => c.id) || [];
      if (caseIds.length > 0) {
        const { data: stageCounts } = await supabase
          .from('virtual_patient_stages')
          .select('case_id')
          .in('case_id', caseIds);

        const countMap = (stageCounts || []).reduce((acc, s) => {
          acc[s.case_id] = (acc[s.case_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return data?.map(c => ({
          ...c,
          stage_count: countMap[c.id] || 0,
        })) as VPCase[];
      }

      return data as VPCase[];
    },
    enabled: true,
  });
}

// Fetch a single case with all stages
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

      const { data: stages, error: stagesError } = await supabase
        .from('virtual_patient_stages')
        .select('*')
        .eq('case_id', caseId!)
        .order('stage_order', { ascending: true });

      if (stagesError) throw stagesError;

      return {
        ...caseData,
        stages: (stages || []).map(s => ({
          ...s,
          choices: (s.choices as unknown as { key: string; text: string }[]) || [],
          correct_answer: s.correct_answer as unknown as string | string[],
          teaching_points: s.teaching_points || [],
        })),
      } as VPCase;
    },
    enabled: !!caseId,
  });
}

// Fetch stages for a case
export function useVirtualPatientStages(caseId?: string) {
  return useQuery({
    queryKey: ['virtual-patient-stages', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_stages')
        .select('*')
        .eq('case_id', caseId!)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        choices: (s.choices as unknown as { key: string; text: string }[]) || [],
        correct_answer: s.correct_answer as unknown as string | string[],
        teaching_points: s.teaching_points || [],
      })) as VPStage[];
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
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .insert({
          ...data,
          created_by: user?.id,
          tags: data.tags || [],
        })
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
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .update({
          ...data,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
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

// Create a stage
export function useCreateVirtualPatientStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, data }: { caseId: string; data: VPStageFormData }) => {
      const { data: result, error } = await supabase
        .from('virtual_patient_stages')
        .insert({
          case_id: caseId,
          stage_order: data.stage_order,
          stage_type: data.stage_type,
          prompt: data.prompt,
          patient_info: data.patient_info || null,
          choices: data.choices as unknown as Json,
          correct_answer: data.correct_answer as unknown as Json,
          explanation: data.explanation || null,
          teaching_points: data.teaching_points || [],
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-stages', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', variables.caseId] });
    },
  });
}

// Update a stage
export function useUpdateVirtualPatientStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caseId, data }: { id: string; caseId: string; data: Partial<VPStageFormData> }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.stage_order !== undefined) updateData.stage_order = data.stage_order;
      if (data.stage_type !== undefined) updateData.stage_type = data.stage_type;
      if (data.prompt !== undefined) updateData.prompt = data.prompt;
      if (data.patient_info !== undefined) updateData.patient_info = data.patient_info;
      if (data.choices !== undefined) updateData.choices = data.choices as unknown as Json;
      if (data.correct_answer !== undefined) updateData.correct_answer = data.correct_answer as unknown as Json;
      if (data.explanation !== undefined) updateData.explanation = data.explanation;
      if (data.teaching_points !== undefined) updateData.teaching_points = data.teaching_points;

      const { data: result, error } = await supabase
        .from('virtual_patient_stages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-stages', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', variables.caseId] });
    },
  });
}

// Delete a stage
export function useDeleteVirtualPatientStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caseId }: { id: string; caseId: string }) => {
      const { error } = await supabase
        .from('virtual_patient_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, caseId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-stages', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', variables.caseId] });
    },
  });
}

// Reorder stages
export function useReorderVirtualPatientStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, stageIds }: { caseId: string; stageIds: string[] }) => {
      // Update each stage with its new order
      const updates = stageIds.map((id, index) =>
        supabase
          .from('virtual_patient_stages')
          .update({ stage_order: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);
      return { caseId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-stages', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-patient-case', variables.caseId] });
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
      return (data || []).map(a => ({
        ...a,
        stage_answers: (a.stage_answers as unknown as Record<string, StageAnswer>) || {},
      })) as VPAttempt[];
    },
    enabled: !!user,
  });
}

// Start an attempt
export function useStartVirtualPatientAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ caseId, totalStages }: { caseId: string; totalStages: number }) => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .insert({
          user_id: user!.id,
          case_id: caseId,
          total_stages: totalStages,
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

// Submit a stage answer
export function useSubmitStageAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      caseId,
      stageId,
      answer,
    }: {
      attemptId: string;
      caseId: string;
      stageId: string;
      answer: StageAnswer;
    }) => {
      // Get current attempt
      const { data: attempt, error: fetchError } = await supabase
        .from('virtual_patient_attempts')
        .select('stage_answers, correct_count')
        .eq('id', attemptId)
        .single();

      if (fetchError) throw fetchError;

      const currentAnswers = (attempt.stage_answers as unknown as Record<string, StageAnswer>) || {};
      const newAnswers = {
        ...currentAnswers,
        [stageId]: answer,
      };

      const newCorrectCount = answer.is_correct 
        ? (attempt.correct_count || 0) + 1 
        : (attempt.correct_count || 0);

      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .update({
          stage_answers: newAnswers as unknown as Json,
          correct_count: newCorrectCount,
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
      // Get current attempt to calculate score
      const { data: attempt, error: fetchError } = await supabase
        .from('virtual_patient_attempts')
        .select('correct_count, total_stages')
        .eq('id', attemptId)
        .single();

      if (fetchError) throw fetchError;

      const score = attempt.total_stages > 0
        ? ((attempt.correct_count || 0) / attempt.total_stages) * 100
        : 0;

      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          time_taken_seconds: timeTakenSeconds,
          score,
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

// Get user's VP statistics
export function useVirtualPatientStats() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['virtual-patient-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .select('score, is_completed')
        .eq('user_id', user!.id);

      if (error) throw error;

      const completed = (data || []).filter(a => a.is_completed);
      const avgScore = completed.length > 0
        ? completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length
        : 0;

      return {
        totalAttempts: data?.length || 0,
        completedAttempts: completed.length,
        averageScore: Math.round(avgScore * 100) / 100,
      };
    },
    enabled: !!user,
  });
}
