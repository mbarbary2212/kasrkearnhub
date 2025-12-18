import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

type ContentTable = 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals' | 'clinical_cases';

export function useUpdateContent(table: ContentTable) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from(table)
        .update({ ...data, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
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
    },
  });
}

export function useSoftDeleteContent(table: ContentTable) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
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
    },
  });
}
