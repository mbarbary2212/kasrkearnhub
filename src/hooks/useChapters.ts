import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleChapter {
  id: string;
  module_id: string;
  chapter_number: number;
  title: string;
  order_index: number;
  created_at: string | null;
}

// Fetch all chapters for a module
export function useModuleChapters(moduleId?: string) {
  return useQuery({
    queryKey: ['module-chapters', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', moduleId!)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ModuleChapter[];
    },
    enabled: !!moduleId,
  });
}

// Fetch a single chapter
export function useChapter(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('id', chapterId!)
        .maybeSingle();

      if (error) throw error;
      return data as ModuleChapter | null;
    },
    enabled: !!chapterId,
  });
}
