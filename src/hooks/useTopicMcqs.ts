import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopicMcq {
  id: string;
  module_id: string;
  topic_id?: string | null;
  stem: string;
  choices: Record<string, string>;
  correct_key: string;
  explanation?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  display_order?: number | null;
  is_deleted: boolean;
  created_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// MCQs for a specific topic (for Pharmacology)
export function useTopicMcqs(topicId?: string) {
  return useQuery({
    queryKey: ['topic-mcqs', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      
      // Query mcq_sets that are linked to this topic
      const { data, error } = await supabase
        .from('mcq_sets')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}
