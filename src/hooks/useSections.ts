import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  name: string;
  section_number: string | null;  // Changed from number to string for hierarchical numbering (e.g., "3.1", "3.10")
  chapter_id: string | null;
  topic_id: string | null;
  display_order: number;
  created_at: string;
}

interface CreateSectionData {
  name: string;
  chapter_id?: string;
  topic_id?: string;
}

interface UpdateSectionData {
  id: string;
  name: string;
}

// Fetch sections for a chapter
export function useChapterSections(chapterId?: string) {
  return useQuery({
    queryKey: ['sections', 'chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Section[];
    },
    enabled: !!chapterId,
  });
}

// Fetch sections for a topic
export function useTopicSections(topicId?: string) {
  return useQuery({
    queryKey: ['sections', 'topic', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('topic_id', topicId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Section[];
    },
    enabled: !!topicId,
  });
}

// Check if sections are enabled for a chapter
export function useChapterSectionsEnabled(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-sections-enabled', chapterId],
    queryFn: async () => {
      if (!chapterId) return false;
      
      const { data, error } = await supabase
        .from('module_chapters')
        .select('enable_sections')
        .eq('id', chapterId)
        .single();

      if (error) throw error;
      return data?.enable_sections ?? false;
    },
    enabled: !!chapterId,
  });
}

// Check if sections are enabled for a topic
export function useTopicSectionsEnabled(topicId?: string) {
  return useQuery({
    queryKey: ['topic-sections-enabled', topicId],
    queryFn: async () => {
      if (!topicId) return false;
      
      const { data, error } = await supabase
        .from('topics')
        .select('enable_sections')
        .eq('id', topicId)
        .single();

      if (error) throw error;
      return data?.enable_sections ?? false;
    },
    enabled: !!topicId,
  });
}

// Toggle sections enabled for a chapter
export function useToggleChapterSections() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ chapterId, enabled }: { chapterId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('module_chapters')
        .update({ enable_sections: enabled })
        .eq('id', chapterId);

      if (error) throw error;
    },
    onSuccess: (_, { chapterId }) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-sections-enabled', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

// Toggle sections enabled for a topic
export function useToggleTopicSections() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ topicId, enabled }: { topicId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('topics')
        .update({ enable_sections: enabled })
        .eq('id', topicId);

      if (error) throw error;
    },
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topic-sections-enabled', topicId] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// Create a new section
export function useCreateSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, chapter_id, topic_id }: CreateSectionData) => {
      // Get the next display order
      let maxOrder = 0;
      
      if (chapter_id) {
        const { data: existing } = await supabase
          .from('sections')
          .select('display_order')
          .eq('chapter_id', chapter_id)
          .order('display_order', { ascending: false })
          .limit(1);
        maxOrder = existing?.[0]?.display_order ?? 0;
      } else if (topic_id) {
        const { data: existing } = await supabase
          .from('sections')
          .select('display_order')
          .eq('topic_id', topic_id)
          .order('display_order', { ascending: false })
          .limit(1);
        maxOrder = existing?.[0]?.display_order ?? 0;
      }
      
      const { data, error } = await supabase
        .from('sections')
        .insert({
          name,
          chapter_id: chapter_id || null,
          topic_id: topic_id || null,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'chapter', data.chapter_id] });
      }
      if (data.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'topic', data.topic_id] });
      }
    },
  });
}

// Update a section
export function useUpdateSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: UpdateSectionData) => {
      const { data, error } = await supabase
        .from('sections')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'chapter', data.chapter_id] });
      }
      if (data.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'topic', data.topic_id] });
      }
    },
  });
}

// Delete a section
export function useDeleteSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sectionId: string) => {
      // First get the section to know which queries to invalidate
      const { data: section, error: fetchError } = await supabase
        .from('sections')
        .select('chapter_id, topic_id')
        .eq('id', sectionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the section (ON DELETE SET NULL will handle content)
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      return section;
    },
    onSuccess: (section) => {
      if (section?.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'chapter', section.chapter_id] });
      }
      if (section?.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'topic', section.topic_id] });
      }
    },
  });
}

// Reorder sections (update display_order for each)
export function useReorderSections() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sections 
    }: { 
      sections: { id: string; display_order: number }[];
    }) => {
      // Update each section's display_order
      const updates = sections.map(({ id, display_order }) =>
        supabase
          .from('sections')
          .update({ display_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all section queries
      queryClient.invalidateQueries({ 
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'sections' 
      });
    },
  });
}

// Bulk assign section to content items
export function useBulkAssignSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      table, 
      itemIds, 
      sectionId 
    }: { 
      table: 'lectures' | 'resources' | 'mcq_sets' | 'mcqs' | 'essays' | 'practicals' | 'study_resources' | 'osce_questions' | 'matching_questions' | 'virtual_patient_cases' | 'true_false_questions';
      itemIds: string[];
      sectionId: string | null;
    }) => {
      const { error } = await supabase
        .from(table)
        .update({ section_id: sectionId })
        .in('id', itemIds);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all content queries
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-resources'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essays'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-clinical-cases'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-study-resources'] });
      queryClient.invalidateQueries({ queryKey: ['matching-questions'] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['module-resources'] });

      // ROBUST: Invalidate ALL MCQ queries regardless of subkeys
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'mcqs'
      });

      // ROBUST: Invalidate ALL OSCE queries (matches actual key pattern)
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'chapter-osce-questions'
      });

      // ROBUST: Invalidate virtual patient cases
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && 
          (q.queryKey[0] === 'clinical-cases' || q.queryKey[0] === 'virtual-patient-cases')
      });
      
      // ROBUST: Invalidate True/False queries
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'true_false'
      });
    },
  });
}
