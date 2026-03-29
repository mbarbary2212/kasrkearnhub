import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ──
export interface AssessmentStructure {
  id: string;
  module_id: string;
  year_id: string;
  name: string;
  assessment_type: string;
  total_marks: number;
  weight_mode: string;
  duration_minutes: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentComponent {
  id: string;
  assessment_id: string;
  component_type: string;
  question_count: number;
  marks_per_question: number;
  total_marks: number | null;
  duration_minutes: number | null;
  display_order: number;
}

export interface ChapterComponentWeight {
  id: string;
  assessment_id: string;
  component_id: string;
  chapter_id: string;
  weight: number;
}

export interface ChapterEligibility {
  id: string;
  assessment_id: string;
  chapter_id: string;
  included_in_exam: boolean;
  allow_mcq: boolean;
  allow_recall: boolean;
  allow_case: boolean;
}

// ── Fetch hooks ──

export function useAssessments(moduleId: string, yearId: string) {
  return useQuery({
    queryKey: ['assessments', moduleId, yearId],
    queryFn: async () => {
      let query = supabase
        .from('assessment_structures')
        .select('*')
        .eq('module_id', moduleId);
      if (yearId) query = query.eq('year_id', yearId);
      const { data, error } = await query.order('created_at');
      if (error) throw error;
      return data as AssessmentStructure[];
    },
    enabled: !!moduleId,
  });
}

export function useAssessmentComponents(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-components', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      const { data, error } = await supabase
        .from('assessment_components')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('display_order');
      if (error) throw error;
      return data as AssessmentComponent[];
    },
    enabled: !!assessmentId,
  });
}

export function useChapterWeights(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['chapter-weights', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      const { data, error } = await supabase
        .from('chapter_component_weights')
        .select('*')
        .eq('assessment_id', assessmentId);
      if (error) throw error;
      return data as ChapterComponentWeight[];
    },
    enabled: !!assessmentId,
  });
}

// ── Mutations ──

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      module_id: string;
      year_id: string;
      name: string;
      assessment_type: string;
      total_marks: number;
      weight_mode: string;
      duration_minutes?: number;
    }) => {
      const { data, error } = await supabase
        .from('assessment_structures')
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessment_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      assessment_id: string;
      component_type: string;
      question_count: number;
      marks_per_question: number;
      display_order: number;
    }) => {
      // Don't include total_marks - it's a generated column
      const { data, error } = await supabase
        .from('assessment_components')
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-components'] });
      toast.success('Component added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      question_count?: number;
      marks_per_question?: number;
    }) => {
      // Never include total_marks - it's a generated column
      const { error } = await supabase
        .from('assessment_components')
        .update(values)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-components'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessment_components').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-components'] });
      toast.success('Component removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertChapterWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      assessment_id: string;
      component_id: string;
      chapter_id: string;
      weight: number;
    }) => {
      const { error } = await supabase
        .from('chapter_component_weights')
        .upsert(values, { onConflict: 'assessment_id,component_id,chapter_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-weights'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Cross-module chapters: Module 423's chapters are included in Module 523
const CROSS_MODULE_CHAPTERS: Record<string, string> = {
  '7f5167dd-b746-4ac6-94f3-109d637df861': '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10',
};

export function useModuleChapters(moduleId: string) {
  return useQuery({
    queryKey: ['blueprint-chapters', moduleId],
    queryFn: async () => {
      const moduleIds = [moduleId];
      const crossModuleId = CROSS_MODULE_CHAPTERS[moduleId];
      if (crossModuleId) moduleIds.push(crossModuleId);

      const { data, error } = await supabase
        .from('module_chapters')
        .select('id, title, module_id, book_label, order_index')
        .in('module_id', moduleIds)
        .order('order_index');
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// ── Eligibility hooks ──

export function useChapterEligibility(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['chapter-eligibility', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      const { data, error } = await supabase
        .from('assessment_chapter_eligibility')
        .select('*')
        .eq('assessment_id', assessmentId);
      if (error) throw error;
      return data as ChapterEligibility[];
    },
    enabled: !!assessmentId,
  });
}

export function useUpsertChapterEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      assessment_id: string;
      chapter_id: string;
      included_in_exam: boolean;
      allow_mcq: boolean;
      allow_recall: boolean;
      allow_case: boolean;
    }) => {
      const { error } = await supabase
        .from('assessment_chapter_eligibility')
        .upsert(values as any, { onConflict: 'assessment_id,chapter_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-eligibility'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Assessment Rules ──

export const ASSESSMENT_RULE_DEFINITIONS = [
  {
    key: 'no_chapter_recall_and_case',
    label: 'No chapter in both Recall & Case',
    description: 'A chapter cannot appear in both Short Answer (Recall) and Short Answer (Case) within the same exam instance.',
    defaultValue: true,
  },
  {
    key: 'no_mcq_topic_repeat',
    label: 'No MCQ topic/subtopic repeat',
    description: 'MCQ questions should not repeat the same topic or subtopic within a single exam.',
    defaultValue: true,
  },
  {
    key: 'only_eligible_chapters',
    label: 'Only eligible chapters',
    description: 'Questions must only be selected from chapters and components marked as eligible.',
    defaultValue: true,
  },
  {
    key: 'partial_pool_allowed',
    label: 'Partial pool selection',
    description: 'Not all eligible chapters must appear in a given exam instance. The generator may select a subset.',
    defaultValue: true,
  },
] as const;

export type AssessmentRuleKey = typeof ASSESSMENT_RULE_DEFINITIONS[number]['key'];

export interface AssessmentRule {
  id: string;
  assessment_id: string;
  rule_key: string;
  rule_value: boolean;
  description: string | null;
}

export function useAssessmentRules(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-rules', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      const { data, error } = await supabase
        .from('assessment_rules')
        .select('*')
        .eq('assessment_id', assessmentId);
      if (error) throw error;
      return data as AssessmentRule[];
    },
    enabled: !!assessmentId,
  });
}

export function useUpsertAssessmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      assessment_id: string;
      rule_key: string;
      rule_value: boolean;
      description: string;
    }) => {
      const { error } = await supabase
        .from('assessment_rules')
        .upsert({
          assessment_id: values.assessment_id,
          rule_key: values.rule_key,
          rule_value: values.rule_value as any,
          description: values.description,
        } as any, { onConflict: 'assessment_id,rule_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-rules'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
