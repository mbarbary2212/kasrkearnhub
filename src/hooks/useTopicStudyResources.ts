import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type StudyResourceType = Database['public']['Enums']['study_resource_type'];

export interface StudyResource {
  id: string;
  title: string;
  resource_type: StudyResourceType;
  content: Record<string, unknown>;
  chapter_id: string;
  module_id: string;
  topic_id?: string;
  display_order: number | null;
  is_deleted: boolean | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

// For topic-based resources, we query by topic_id
// Since study_resources table might not have topic_id, we'll use a different approach
// For now, return empty - admin will need to upload directly
export function useTopicStudyResources(topicId?: string) {
  return useQuery({
    queryKey: ['topic-study-resources', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      
      // Study resources are chapter-based, not topic-based
      // For topics (Pharmacology), we'll need to handle this differently
      // For now, return empty array - content can be added later via topic lectures/resources
      return [] as StudyResource[];
    },
    enabled: !!topicId,
  });
}
