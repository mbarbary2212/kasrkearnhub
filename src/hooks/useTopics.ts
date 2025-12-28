import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Topic } from '@/types/database';

export function useTopics(departmentId: string | undefined, moduleId?: string | undefined) {
  return useQuery({
    queryKey: ['topics', departmentId, moduleId],
    queryFn: async () => {
      if (!departmentId) return [];
      
      let query = supabase
        .from('topics')
        .select('*')
        .eq('department_id', departmentId);
      
      // If moduleId is provided, filter by it
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }
      
      const { data, error } = await query.order('display_order');

      if (error) throw error;
      return data as Topic[];
    },
    enabled: !!departmentId,
  });
}

export function useTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!topicId) return null;
      
      const { data, error } = await supabase
        .from('topics')
        .select('*, departments(*)')
        .eq('id', topicId)
        .maybeSingle();

      if (error) throw error;
      return data as (Topic & { departments: import('@/types/database').Department }) | null;
    },
    enabled: !!topicId,
  });
}

export function useTopicBySlug(departmentSlug: string, topicSlug: string) {
  return useQuery({
    queryKey: ['topic', departmentSlug, topicSlug],
    queryFn: async () => {
      // First get the department
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('slug', departmentSlug)
        .maybeSingle();

      if (deptError) throw deptError;
      if (!dept) return null;

      // Then get the topic
      const { data, error } = await supabase
        .from('topics')
        .select('*, departments(*)')
        .eq('department_id', dept.id)
        .eq('slug', topicSlug)
        .maybeSingle();

      if (error) throw error;
      return data as (Topic & { departments: import('@/types/database').Department }) | null;
    },
    enabled: !!departmentSlug && !!topicSlug,
  });
}
