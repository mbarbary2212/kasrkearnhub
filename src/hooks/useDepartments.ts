import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Department, DepartmentCategory } from '@/types/database';
import { logActivity } from '@/lib/activityLog';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useDepartmentsByYear(year: number) {
  return useQuery({
    queryKey: ['departments', 'year', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .contains('years', [year])
        .order('display_order');

      if (error) throw error;
      return data as Department[];
    },
    enabled: year >= 1 && year <= 5,
  });
}

export function useDepartment(slug: string) {
  return useQuery({
    queryKey: ['department', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Department | null;
    },
    enabled: !!slug,
  });
}

// Department mutations
export interface CreateDepartmentData {
  name: string;
  name_ar?: string;
  slug: string;
  category: DepartmentCategory;
  years: number[];
  icon?: string;
  description?: string;
  display_order?: number;
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDepartmentData) => {
      const { data: result, error } = await supabase
        .from('departments')
        .insert({
          name: data.name,
          name_ar: data.name_ar || null,
          slug: data.slug,
          category: data.category,
          years: data.years,
          icon: data.icon || 'BookOpen',
          description: data.description || null,
          display_order: data.display_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      logActivity({
        action: 'created_department',
        entity_type: 'department',
        entity_id: result.id,
        metadata: { name: result.name },
      });
    },
  });
}

export interface UpdateDepartmentData {
  id: string;
  name?: string;
  name_ar?: string;
  slug?: string;
  category?: DepartmentCategory;
  years?: number[];
  icon?: string;
  description?: string;
  display_order?: number;
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateDepartmentData) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      logActivity({
        action: 'updated_department',
        entity_type: 'department',
        entity_id: result.id,
        metadata: { name: result.name },
      });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      logActivity({
        action: 'deleted_department',
        entity_type: 'department',
        entity_id: id,
      });
    },
  });
}
