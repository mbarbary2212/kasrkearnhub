import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaseScenario {
  id: string;
  stem: string;
  chapter_id: string | null;
  module_id: string | null;
  topic_id: string | null;
  difficulty: string;
  display_order: number;
  is_deleted: boolean;
  tags: string[] | null;
  created_at: string;
  section_id?: string | null;
}

export function useChapterCaseScenarios(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', 'chapter', chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenarios')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CaseScenario[];
    },
  });
}

export function useChapterCaseScenarioCount(chapterId?: string) {
  return useQuery({
    queryKey: ['case-scenario-count', 'chapter', chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('case_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useTopicCaseScenarios(topicId?: string) {
  return useQuery({
    queryKey: ['case-scenarios', 'topic', topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_scenarios')
        .select('*')
        .eq('topic_id', topicId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CaseScenario[];
    },
  });
}

export function useTopicCaseScenarioCount(topicId?: string) {
  return useQuery({
    queryKey: ['case-scenario-count', 'topic', topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('case_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topicId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
  });
}
