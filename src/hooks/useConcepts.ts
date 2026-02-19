import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Concept {
  id: string;
  module_id: string;
  chapter_id: string | null;
  section_id: string | null;
  title: string;
  concept_key: string;
  created_by: string | null;
  created_at: string;
}

/** Fetch concepts for a module, optionally filtered by chapter/section */
export function useConcepts(moduleId?: string, chapterId?: string, sectionId?: string) {
  return useQuery({
    queryKey: ['concepts', moduleId, chapterId, sectionId],
    queryFn: async () => {
      let query = supabase
        .from('concepts')
        .select('*')
        .eq('module_id', moduleId!)
        .order('title');

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      } else if (chapterId) {
        // Show concepts for this chapter (with or without section)
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Concept[];
    },
    enabled: !!moduleId,
  });
}

/** Create a new concept inline */
export function useCreateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      module_id: string;
      chapter_id?: string | null;
      section_id?: string | null;
      title: string;
      concept_key: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('concepts')
        .insert({
          module_id: input.module_id,
          chapter_id: input.chapter_id || null,
          section_id: input.section_id || null,
          title: input.title,
          concept_key: input.concept_key,
          created_by: userData.user?.id,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Concept;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}
