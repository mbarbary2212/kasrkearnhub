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
      // Check for existing section with the same normalized name
      const trimmedName = name.trim();
      if (chapter_id) {
        const { data: existing } = await supabase
          .from('sections')
          .select('id')
          .eq('chapter_id', chapter_id)
          .ilike('name', trimmedName)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error('A section with this name already exists in this chapter');
        }
      } else if (topic_id) {
        const { data: existing } = await supabase
          .from('sections')
          .select('id')
          .eq('topic_id', topic_id)
          .ilike('name', trimmedName)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error('A section with this name already exists in this topic');
        }
      }

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
          name: trimmedName,
          chapter_id: chapter_id || null,
          topic_id: topic_id || null,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A section with this name already exists');
        }
        throw error;
      }
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

// Detect sections with duplicate section_number values (informational warning)
export function useSectionDuplicateWarnings(chapterId?: string) {
  return useQuery({
    queryKey: ['section-number-warnings', chapterId],
    queryFn: async () => {
      if (!chapterId) return new Set<string>();
      
      const { data, error } = await supabase
        .from('sections')
        .select('id, section_number')
        .eq('chapter_id', chapterId)
        .not('section_number', 'is', null);

      if (error) throw error;
      
      // Find section_numbers that appear more than once
      const numCounts = new Map<string, string[]>();
      for (const s of data || []) {
        if (!s.section_number) continue;
        const key = s.section_number.trim();
        if (!numCounts.has(key)) numCounts.set(key, []);
        numCounts.get(key)!.push(s.id);
      }
      
      const warningIds = new Set<string>();
      for (const ids of numCounts.values()) {
        if (ids.length > 1) ids.forEach(id => warningIds.add(id));
      }
      return warningIds;
    },
    enabled: !!chapterId,
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

// Fetch section IDs for a single lecture (from junction table)
export function useLectureSectionIds(lectureId?: string) {
  return useQuery({
    queryKey: ['lecture-sections', lectureId],
    queryFn: async () => {
      if (!lectureId) return [];
      const { data, error } = await supabase
        .from('lecture_sections')
        .select('section_id')
        .eq('lecture_id', lectureId);
      if (error) throw error;
      return (data || []).map((r: { section_id: string }) => r.section_id);
    },
    enabled: !!lectureId,
  });
}

// Fetch all lecture_sections for a chapter (for filtering)
// Returns Map<section_id, Set<lecture_id>>
export function useChapterLectureSectionsMap(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-lecture-sections-map', chapterId],
    queryFn: async () => {
      if (!chapterId) return new Map<string, Set<string>>();
      const { data, error } = await supabase
        .from('lecture_sections')
        .select('lecture_id, section_id, lectures!inner(chapter_id)')
        .eq('lectures.chapter_id', chapterId);
      if (error) throw error;
      const map = new Map<string, Set<string>>();
      for (const row of data || []) {
        const r = row as { lecture_id: string; section_id: string };
        if (!map.has(r.section_id)) map.set(r.section_id, new Set());
        map.get(r.section_id)!.add(r.lecture_id);
      }
      return map;
    },
    enabled: !!chapterId,
  });
}

// Replace all section assignments for a lecture
export function useSetLectureSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lectureId, sectionIds }: { lectureId: string; sectionIds: string[] }) => {
      // Delete existing
      const { error: delError } = await supabase
        .from('lecture_sections')
        .delete()
        .eq('lecture_id', lectureId);
      if (delError) throw delError;

      // Insert new
      if (sectionIds.length > 0) {
        const { error: insError } = await supabase
          .from('lecture_sections')
          .insert(sectionIds.map((section_id) => ({ lecture_id: lectureId, section_id })));
        if (insError) throw insError;
      }

      // Keep section_id in sync with first selected (for sorting)
      const { error: updError } = await supabase
        .from('lectures')
        .update({ section_id: sectionIds[0] ?? null })
        .eq('id', lectureId);
      if (updError) throw updError;
    },
    onSuccess: (_, { lectureId }) => {
      queryClient.invalidateQueries({ queryKey: ['lecture-sections', lectureId] });
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'chapter-lecture-sections-map' });
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['lectures'] });
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
