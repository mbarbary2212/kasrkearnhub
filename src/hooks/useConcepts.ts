import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Concept {
  id: string;
  module_id: string;
  chapter_id: string | null;
  section_id: string | null;
  title: string;
  concept_key: string;
  display_order: number;
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
        .order('display_order')
        .order('title');

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      } else if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Concept[];
    },
    enabled: !!moduleId,
  });
}

/** Fetch concepts scoped to a chapter (convenience wrapper) */
export function useChapterConcepts(chapterId?: string, moduleId?: string) {
  return useQuery({
    queryKey: ['concepts', 'chapter', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order')
        .order('title');
      if (error) throw error;
      return (data ?? []) as Concept[];
    },
    enabled: !!chapterId,
  });
}

/** Fetch concepts scoped to a topic via its module */
export function useTopicConcepts(topicId?: string, moduleId?: string) {
  return useQuery({
    queryKey: ['concepts', 'topic', topicId],
    queryFn: async () => {
      // Topics don't have a direct chapter_id on concepts, so we fetch by module
      // and filter by section_id being null or matching topic sections
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('module_id', moduleId!)
        .is('chapter_id', null)
        .order('display_order')
        .order('title');
      if (error) throw error;
      return (data ?? []) as Concept[];
    },
    enabled: !!topicId && !!moduleId,
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
      display_order?: number;
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
          display_order: input.display_order ?? 0,
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

/** Update a concept (rename) */
export function useUpdateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; title: string; concept_key?: string }) => {
      const updateData: Record<string, unknown> = { title: input.title };
      if (input.concept_key) updateData.concept_key = input.concept_key;
      
      const { data, error } = await supabase
        .from('concepts')
        .update(updateData as never)
        .eq('id', input.id)
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

/** Delete a concept */
export function useDeleteConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('concepts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}

/** Reorder concepts (update display_order) */
export function useReorderConcepts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { concepts: { id: string; display_order: number }[] }) => {
      const updates = input.concepts.map((c) =>
        supabase
          .from('concepts')
          .update({ display_order: c.display_order } as never)
          .eq('id', c.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}

/** Auto-align existing content to concepts using AI */
export function useAutoAlignConcepts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      chapterId: string;
      conceptList: { id: string; title: string; concept_key: string }[];
      retag_all?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('auto-align-concepts', {
        body: {
          chapterId: input.chapterId,
          conceptList: input.conceptList,
          retag_all: input.retag_all ?? false,
        },
      });

      if (error) throw error;
      return data as {
        tagged: number;
        skipped_low_confidence: number;
        already_tagged: number;
        errors: number;
      };
    },
    onSuccess: () => {
      // Invalidate all content queries so tables refresh
      queryClient.invalidateQueries({ queryKey: ['mcqs'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['osce-questions'] });
      queryClient.invalidateQueries({ queryKey: ['matching-questions'] });
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['true-false-questions'] });
      queryClient.invalidateQueries({ queryKey: ['lectures'] });
    },
  });
}
