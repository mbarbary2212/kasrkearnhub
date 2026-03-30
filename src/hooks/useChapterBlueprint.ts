import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChapterBlueprintConfig {
  id: string;
  module_id: string;
  chapter_id: string;
  exam_type: string;
  component_type: string;
  inclusion_level: 'high' | 'average' | 'low';
  created_at: string;
  updated_at: string;
}

export const EXAM_TYPES = [
  { key: 'written', label: 'Written Exam' },
  { key: 'clinical', label: 'Clinical Exam' },
  { key: 'osce', label: 'OSCE' },
  { key: 'long_case', label: 'Long Case' },
  { key: 'paraclinical', label: 'Paraclinical' },
] as const;

export const COMPONENT_TYPES = [
  { key: 'mcq', label: 'MCQ' },
  { key: 'short_answer_recall', label: 'Recall' },
  { key: 'short_answer_case', label: 'Case' },
  { key: 'osce', label: 'OSCE' },
  { key: 'long_case', label: 'Long Case' },
  { key: 'paraclinical', label: 'Paraclinical' },
] as const;

export const INCLUSION_LEVELS = ['high', 'average', 'low'] as const;

export function useChapterBlueprintConfigs(moduleId: string) {
  return useQuery({
    queryKey: ['chapter-blueprint-config', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_blueprint_config')
        .select('*')
        .eq('module_id', moduleId);
      if (error) throw error;
      return data as unknown as ChapterBlueprintConfig[];
    },
    enabled: !!moduleId,
  });
}

export function useUpsertChapterBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      module_id: string;
      chapter_id: string;
      exam_type: string;
      component_type: string;
      inclusion_level: string;
    }) => {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .upsert(values as any, { onConflict: 'chapter_id,exam_type,component_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-blueprint-config'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChapterBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      chapter_id: string;
      exam_type: string;
      component_type: string;
    }) => {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .delete()
        .eq('chapter_id', params.chapter_id)
        .eq('exam_type', params.exam_type)
        .eq('component_type', params.component_type);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapter-blueprint-config'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
