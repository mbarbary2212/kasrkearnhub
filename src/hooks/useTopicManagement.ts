import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateTopicData {
  departmentId: string;
  moduleId: string;
  name: string;
  description?: string | null;
}

interface UpdateTopicData {
  topicId: string;
  departmentId: string;
  moduleId?: string;
  data: {
    name?: string;
    description?: string | null;
  };
}

interface DeleteTopicData {
  topicId: string;
  departmentId: string;
  moduleId?: string;
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ departmentId, moduleId, name, description }: CreateTopicData) => {
      // Get next display order for this department+module combination
      const { data: existingTopics } = await supabase
        .from('topics')
        .select('display_order')
        .eq('department_id', departmentId)
        .eq('module_id', moduleId)
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextOrder = ((existingTopics?.[0]?.display_order || 0) + 1);
      
      const { data, error } = await supabase
        .from('topics')
        .insert({
          department_id: departmentId,
          module_id: moduleId,
          name,
          slug: generateSlug(name),
          description,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['topics', variables.departmentId, variables.moduleId] });
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ topicId, data }: UpdateTopicData) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // If name changed, update slug too
      if (data.name) {
        updateData.slug = generateSlug(data.name);
      }
      
      const { data: result, error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['topics', variables.departmentId, variables.moduleId] });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ topicId }: DeleteTopicData) => {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['topics', variables.departmentId, variables.moduleId] });
    },
  });
}
