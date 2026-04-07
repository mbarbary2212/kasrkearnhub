import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lecture, Resource, McqSet, McqQuestion, Essay, Practical } from '@/types/database';

export function useLectures(topicId: string | undefined) {
  return useQuery({
    queryKey: ['lectures', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data as Lecture[];
    },
    enabled: !!topicId,
  });
}

export function useResources(topicId: string | undefined) {
  return useQuery({
    queryKey: ['resources', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!topicId,
  });
}

export function useMcqSets(topicId: string | undefined) {
  return useQuery({
    queryKey: ['mcq_sets', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from('mcq_sets')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data as McqSet[];
    },
    enabled: !!topicId,
  });
}

export function useMcqQuestions(mcqSetId: string | undefined) {
  return useQuery({
    queryKey: ['mcq_questions', mcqSetId],
    queryFn: async () => {
      if (!mcqSetId) return [];

      const { data, error } = await supabase
        .from('mcq_questions')
        .select('*')
        .eq('mcq_set_id', mcqSetId)
        .order('display_order');

      if (error) throw error;
      return data as McqQuestion[];
    },
    enabled: !!mcqSetId,
  });
}

export function useEssays(topicId: string | undefined) {
  return useQuery({
    queryKey: ['essays', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      // STRICT ANSWER ISOLATION: Never include model_answer in list queries
      const { data, error } = await supabase
        .from('essays')
        .select('id, title, question, rating, max_points, keywords, is_deleted, chapter_id, topic_id, section_id, difficulty_level, question_type, rubric_json, display_order, created_at, module_id')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data as Essay[];
    },
    enabled: !!topicId,
  });
}

export function usePracticals(topicId: string | undefined) {
  return useQuery({
    queryKey: ['practicals', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from('practicals')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data as Practical[];
    },
    enabled: !!topicId,
  });
}

export function useVirtualPatientCases(topicId: string | undefined) {
  return useQuery({
    queryKey: ['virtual-patient-cases', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from('virtual_patient_cases')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order');

      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });
}
