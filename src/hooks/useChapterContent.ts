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
        .eq('is_deleted', false)
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
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}




// Lightweight count-only hook for chapter essays (badges)
export function useChapterEssayCount(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-essay-count', chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('essays')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch essays for a chapter
export function useChapterEssays(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['chapter-essays', chapterId, includeDeleted],
    queryFn: async () => {
      // STRICT ANSWER ISOLATION: Never include model_answer in list queries
      const selectColumns = includeDeleted
        ? 'id, title, question, rating, max_points, keywords, is_deleted, chapter_id, section_id, difficulty_level, question_type, rubric_json, display_order, created_at'
        : 'id, title, question, rating, max_points, keywords, is_deleted, chapter_id, section_id, difficulty_level, question_type, rubric_json, display_order, created_at';
      let query = supabase
        .from('essays')
        .select(selectColumns)
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!chapterId && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}




// Lightweight count-only hook for chapter clinical cases (badges)
export function useChapterClinicalCaseCount(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-clinical-case-count', chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('virtual_patient_cases')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .eq('is_published', true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
