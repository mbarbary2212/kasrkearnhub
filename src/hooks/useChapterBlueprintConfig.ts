import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChapterBlueprintConfig {
  id: string;
  chapter_id: string;
  module_id: string;
  section_id: string | null;
  exam_type: string;
  component_type: string;
  inclusion_level: string;
  question_types: string[];
  created_at: string;
  updated_at: string;
}

export const COMPONENT_COLUMNS = [
  { key: 'mcq', label: 'MCQ' },
  { key: 'recall', label: 'Recall' },
  { key: 'case', label: 'Case' },
  { key: 'osce', label: 'OSCE' },
  { key: 'long_case', label: 'Long Case' },
  { key: 'paraclinical', label: 'Paraclinical' },
] as const;

export type InclusionLevel = 'high' | 'average' | 'low';

export const INCLUSION_LEVELS: { value: InclusionLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'average', label: 'Average' },
  { value: 'low', label: 'Low' },
];

export const QUESTION_TYPE_OPTIONS = [
  { value: 'sba', label: 'Single Best Answer (SBA)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'emq', label: 'Extended Matching (EMQ)' },
  { value: 'cross_matching', label: 'Cross-matching' },
  { value: 'matching', label: 'Matching' },
  { value: 'cloze', label: 'Fill-in-blank (Cloze)' },
  { value: 'short_essay', label: 'Short Essay' },
  { value: 'long_essay', label: 'Long Essay' },
  { value: 'clinical_case', label: 'Clinical Scenario (Case)' },
  { value: 'case_scenario', label: 'Case Scenarios (Short Case)' },
  { value: 'osce_station', label: 'OSCE Station' },
  { value: 'spot_diagnosis', label: 'Spot Diagnosis' },
  { value: 'paraclinical', label: 'Paraclinical Interpretation' },
  { value: 'image_question', label: 'Image Questions' },
  { value: 'practical', label: 'Practical' },
] as const;

/** Build a consistent map key for configs */
export function configKey(chapterId: string, sectionId: string | null, componentType: string) {
  return `${chapterId}::${sectionId ?? ''}::${componentType}`;
}

export function useChapterBlueprintConfigs(moduleId?: string) {
  return useQuery({
    queryKey: ['chapter-blueprint-config', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_blueprint_config')
        .select('*')
        .eq('module_id', moduleId!);
      if (error) throw error;
      return data as ChapterBlueprintConfig[];
    },
    enabled: !!moduleId,
  });
}

export function useUpsertChapterBlueprintConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      chapter_id: string;
      module_id: string;
      section_id?: string | null;
      exam_type: string;
      component_type: string;
      inclusion_level: string;
      question_types?: string[];
    }) => {
      // Because we use a COALESCE unique index (not a constraint),
      // we need to manually check + insert/update
      const sectionId = input.section_id ?? null;

      // Try to find existing
      let query = supabase
        .from('chapter_blueprint_config')
        .select('id')
        .eq('chapter_id', input.chapter_id)
        .eq('exam_type', input.exam_type)
        .eq('component_type', input.component_type);

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      } else {
        query = query.is('section_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('chapter_blueprint_config')
          .update({ inclusion_level: input.inclusion_level, question_types: input.question_types ?? [] })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('chapter_blueprint_config')
          .insert({
            chapter_id: input.chapter_id,
            module_id: input.module_id,
            section_id: sectionId,
            exam_type: input.exam_type,
            component_type: input.component_type,
            inclusion_level: input.inclusion_level,
            question_types: input.question_types ?? [],
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-blueprint-config'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to save: ' + err.message);
    },
  });
}

export function useDeleteChapterBlueprintConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; module_id: string }) => {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-blueprint-config'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to remove: ' + err.message);
    },
  });
}
