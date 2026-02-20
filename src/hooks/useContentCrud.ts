import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLog';

type ContentTable = 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals' | 'clinical_cases';

export function useUpdateContent(table: ContentTable) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data, moduleId, chapterId }: { 
      id: string; 
      data: Record<string, unknown>;
      moduleId?: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from(table)
        .update({ ...data, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { id, moduleId, chapterId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-resources'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essays'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals'] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['module-resources'] });
      queryClient.invalidateQueries({ queryKey: ['module-mcq-sets'] });
      queryClient.invalidateQueries({ queryKey: ['module-essays'] });
      queryClient.invalidateQueries({ queryKey: ['module-practicals'] });
      
      // Log activity for essays
      if (table === 'essays' && result.id) {
        logActivity({
          action: 'updated_essay',
          entity_type: 'essay',
          entity_id: result.id,
          scope: { module_id: result.moduleId, chapter_id: result.chapterId },
          metadata: { source: 'admin_form' },
        });
      }
    },
  });
}

export function useSoftDeleteContent(table: ContentTable) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, moduleId, chapterId }: { 
      id: string;
      moduleId?: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { id, moduleId, chapterId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-resources'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essays'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals'] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures'] });
      queryClient.invalidateQueries({ queryKey: ['module-resources'] });
      queryClient.invalidateQueries({ queryKey: ['module-mcq-sets'] });
      queryClient.invalidateQueries({ queryKey: ['module-essays'] });
      queryClient.invalidateQueries({ queryKey: ['module-practicals'] });
      
      // Log activity for essays
      if (table === 'essays' && result.id) {
        logActivity({
          action: 'deleted_essay',
          entity_type: 'essay',
          entity_id: result.id,
          scope: { module_id: result.moduleId, chapter_id: result.chapterId },
        });
      }
    },
  });
}
