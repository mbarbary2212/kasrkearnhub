import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AssessmentType = 'formative' | 'final_written' | 'final_practical' | 'module_exam';
export type ExamComponentType = 'mcq' | 'short_answer_recall' | 'short_answer_case' | 'osce' | 'long_case' | 'short_case' | 'paraclinical';

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  formative: 'Formative',
  final_written: 'Final Written',
  final_practical: 'Final Practical',
  module_exam: 'Module Exam',
};

export const COMPONENT_TYPE_LABELS: Record<ExamComponentType, string> = {
  mcq: 'MCQ',
  short_answer_recall: 'Short Answer (Recall)',
  short_answer_case: 'Short Answer (Case)',
  osce: 'OSCE',
  long_case: 'Long Case',
  short_case: 'Short Case',
  paraclinical: 'Paraclinical',
};

export interface AssessmentStructure {
  id: string;
  year_id: string;
  module_id: string;
  assessment_type: AssessmentType;
  name: string;
  total_marks: number;
  duration_minutes: number | null;
  notes: string | null;
  is_active: boolean;
  weight_mode: 'percent' | 'marks';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentComponent {
  id: string;
  assessment_id: string;
  component_type: ExamComponentType;
  question_count: number;
  marks_per_question: number;
  total_marks: number;
  duration_minutes: number | null;
  display_order: number;
  created_at: string;
}

export interface TopicExamWeight {
  id: string;
  assessment_id: string;
  component_id: string | null;
  module_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  weight_percent: number;
  weight_marks: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all assessment structures, optionally filtered
export function useAssessmentStructures(moduleId?: string) {
  return useQuery({
    queryKey: ['assessment-structures', moduleId],
    queryFn: async () => {
      let query = supabase
        .from('assessment_structures')
        .select('*')
        .order('created_at', { ascending: false });
      if (moduleId) query = query.eq('module_id', moduleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AssessmentStructure[];
    },
  });
}

// Fetch components for an assessment
export function useAssessmentComponents(assessmentId?: string) {
  return useQuery({
    queryKey: ['assessment-components', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_components')
        .select('*')
        .eq('assessment_id', assessmentId!)
        .order('display_order');
      if (error) throw error;
      return (data || []) as AssessmentComponent[];
    },
    enabled: !!assessmentId,
  });
}

// Fetch weights for an assessment
export function useTopicExamWeights(assessmentId?: string) {
  return useQuery({
    queryKey: ['topic-exam-weights', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topic_exam_weights')
        .select('*')
        .eq('assessment_id', assessmentId!);
      if (error) throw error;
      return (data || []) as TopicExamWeight[];
    },
    enabled: !!assessmentId,
  });
}

// Mutations
export function useAssessmentMutations() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  const upsertStructure = useMutation({
    mutationFn: async (input: Omit<AssessmentStructure, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { id?: string }) => {
      const payload = { ...input, created_by: user?.id };
      if (input.id) {
        const { data, error } = await supabase
          .from('assessment_structures')
          .update(payload)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('assessment_structures')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-structures'] });
      toast.success('Assessment saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStructure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessment_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-structures'] });
      toast.success('Assessment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertComponent = useMutation({
    mutationFn: async (input: { id?: string; assessment_id: string; component_type: ExamComponentType; question_count: number; marks_per_question: number; duration_minutes?: number | null; display_order?: number }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('assessment_components')
          .update(input)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('assessment_components')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessment-components', vars.assessment_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComponent = useMutation({
    mutationFn: async ({ id, assessmentId }: { id: string; assessmentId: string }) => {
      const { error } = await supabase.from('assessment_components').delete().eq('id', id);
      if (error) throw error;
      return assessmentId;
    },
    onSuccess: (assessmentId) => {
      qc.invalidateQueries({ queryKey: ['assessment-components', assessmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertWeight = useMutation({
    mutationFn: async (input: Omit<TopicExamWeight, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('topic_exam_weights')
          .update(input)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('topic_exam_weights')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['topic-exam-weights', vars.assessment_id] });
      toast.success('Weight saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWeight = useMutation({
    mutationFn: async ({ id, assessmentId }: { id: string; assessmentId: string }) => {
      const { error } = await supabase.from('topic_exam_weights').delete().eq('id', id);
      if (error) throw error;
      return assessmentId;
    },
    onSuccess: (assessmentId) => {
      qc.invalidateQueries({ queryKey: ['topic-exam-weights', assessmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { upsertStructure, deleteStructure, upsertComponent, deleteComponent, upsertWeight, deleteWeight };
}
