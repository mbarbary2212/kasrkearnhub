import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ClinicalCase, 
  ClinicalCaseStage, 
  ClinicalCaseAttempt, 
  ClinicalCaseFormData, 
  ClinicalCaseStageFormData, 
  CaseStageAnswer, 
  CaseRubric,
  CaseMode 
} from '@/types/clinicalCase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

// Helper to parse stage data from DB
function parseStageData(s: any): ClinicalCaseStage {
  return {
    ...s,
    choices: (s.choices as unknown as { key: string; text: string }[]) || [],
    correct_answer: s.correct_answer as unknown as string | string[],
    teaching_points: s.teaching_points || [],
    rubric: s.rubric ? (s.rubric as unknown as CaseRubric) : null,
  };
}

// Fetch all clinical cases for a module (student view - published only)
export function useClinicalCases(
  moduleId?: string, 
  includeUnpublished = false,
  caseMode?: CaseMode | 'all'
) {
  return useQuery({
    queryKey: ['clinical-cases', moduleId, includeUnpublished, caseMode],
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

      if (caseMode && caseMode !== 'all') {
        query = query.eq('case_mode', caseMode);
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
        })) as unknown as ClinicalCase[];
      }

      return data as unknown as ClinicalCase[];
    },
    enabled: true,
  });
}

// Fetch a single case with all stages
export function useClinicalCase(caseId?: string) {
  return useQuery({
    queryKey: ['clinical-case', caseId],
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
        stages: (stages || []).map(parseStageData),
        stage_count: stages?.length || 0,
      } as unknown as ClinicalCase;
    },
    enabled: !!caseId,
  });
}

// Fetch stages for a case
export function useClinicalCaseStages(caseId?: string) {
  return useQuery({
    queryKey: ['clinical-case-stages', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_stages')
        .select('*')
        .eq('case_id', caseId!)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(parseStageData) as ClinicalCaseStage[];
    },
    enabled: !!caseId,
  });
}

// Create a new case
export function useCreateClinicalCase() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: ClinicalCaseFormData) => {
      const insertData: Record<string, unknown> = {
        ...data,
        case_mode: data.case_mode || 'practice_case',
        created_by: user?.id,
        tags: data.tags || [],
      };
      if (data.initial_state_json !== undefined) {
        insertData.initial_state_json = data.initial_state_json as unknown as Json;
      }
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-clinical-case-count'] });
    },
  });
}

// Update a case
export function useUpdateClinicalCase() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClinicalCaseFormData> }) => {
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      if (data.initial_state_json !== undefined) {
        updateData.initial_state_json = data.initial_state_json as unknown as Json;
      }
      const { data: result, error } = await supabase
        .from('virtual_patient_cases')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-case', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['chapter-clinical-case-count'] });
    },
  });
}

// Delete (soft delete) a case
export function useDeleteClinicalCase() {
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
      queryClient.invalidateQueries({ queryKey: ['clinical-cases'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-clinical-case-count'] });
    },
  });
}

// Create a stage
export function useCreateClinicalCaseStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, data }: { caseId: string; data: ClinicalCaseStageFormData }) => {
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
          rubric: data.rubric ? (data.rubric as unknown as Json) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinical-case-stages', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-case', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['chapter-clinical-case-count'] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['clinical-case', variables.caseId] });
      await queryClient.refetchQueries({ queryKey: ['clinical-cases'] });
    },
  });
}

// Update a stage
export function useUpdateClinicalCaseStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caseId, data }: { id: string; caseId: string; data: Partial<ClinicalCaseStageFormData> }) => {
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
      if (data.rubric !== undefined) updateData.rubric = data.rubric ? (data.rubric as unknown as Json) : null;

      const { data: result, error } = await supabase
        .from('virtual_patient_stages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinical-case-stages', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-case', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-cases'] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['clinical-case', variables.caseId] });
    },
  });
}

// Delete a stage
export function useDeleteClinicalCaseStage() {
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
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinical-case-stages', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-case', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-cases'] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['clinical-case', variables.caseId] });
      await queryClient.refetchQueries({ queryKey: ['clinical-cases'] });
    },
  });
}

// Reorder stages
export function useReorderClinicalCaseStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, stageIds }: { caseId: string; stageIds: string[] }) => {
      const updates = stageIds.map((id, index) =>
        supabase
          .from('virtual_patient_stages')
          .update({ stage_order: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);
      return { caseId };
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinical-case-stages', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-case', variables.caseId] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-cases'] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['clinical-case', variables.caseId] });
    },
  });
}

// User attempts
export function useClinicalCaseAttempts(caseId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['clinical-case-attempts', caseId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('virtual_patient_attempts')
        .select(`
          *,
          case:virtual_patient_cases(title, level, estimated_minutes, case_mode)
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
        stage_answers: (a.stage_answers as unknown as Record<string, CaseStageAnswer>) || {},
      })) as ClinicalCaseAttempt[];
    },
    enabled: !!user,
  });
}

// Start an attempt
export function useStartClinicalCaseAttempt() {
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
      queryClient.invalidateQueries({ queryKey: ['clinical-case-attempts', variables.caseId] });
    },
  });
}

// Submit a stage answer
export function useSubmitCaseStageAnswer() {
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
      answer: CaseStageAnswer;
    }) => {
      const { data: attempt, error: fetchError } = await supabase
        .from('virtual_patient_attempts')
        .select('stage_answers, correct_count')
        .eq('id', attemptId)
        .single();

      if (fetchError) throw fetchError;

      const currentAnswers = (attempt.stage_answers as unknown as Record<string, CaseStageAnswer>) || {};
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
      queryClient.invalidateQueries({ queryKey: ['clinical-case-attempts', variables.caseId] });
    },
  });
}

// Complete an attempt
export function useCompleteClinicalCaseAttempt() {
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
      queryClient.invalidateQueries({ queryKey: ['clinical-case-attempts', variables.caseId] });
    },
  });
}

// Get user's clinical case statistics
export function useClinicalCaseStats() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['clinical-case-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_attempts')
        .select('id, is_completed, score')
        .eq('user_id', user!.id);

      if (error) throw error;

      const completedAttempts = data?.filter(a => a.is_completed) || [];
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
        : 0;

      return {
        totalAttempts: data?.length || 0,
        completedAttempts: completedAttempts.length,
        averageScore: Math.round(avgScore),
      };
    },
    enabled: !!user,
  });
}
