import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch lectures for a chapter
export function useChapterLectures(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-lectures', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

// Fetch resources for a chapter
export function useChapterResources(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-resources', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

// Fetch MCQ sets for a chapter
export function useChapterMcqSets(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-mcq-sets', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_sets')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

// Fetch essays for a chapter
export function useChapterEssays(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-essays', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

// Fetch practicals for a chapter
export function useChapterPracticals(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-practicals', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practicals')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

// Fetch clinical cases for a chapter
export function useChapterClinicalCases(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-clinical-cases', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_cases')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}
