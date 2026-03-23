import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Module, ModuleWithDepartments } from '@/types/curriculum';

export function useModules(yearId?: string) {
  return useQuery({
    queryKey: ['modules', yearId],
    queryFn: async () => {
      let query = supabase
        .from('modules')
        .select('*')
        .order('display_order', { ascending: true });

      if (yearId) {
        query = query.eq('year_id', yearId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Module[];
    },
    enabled: !yearId || !!yearId,
  });
}

export function useModulesByYearNumber(yearNumber: number) {
  return useQuery({
    queryKey: ['modules-by-year-number', yearNumber],
    queryFn: async () => {
      // First get the year by number
      const { data: year, error: yearError } = await supabase
        .from('years')
        .select('id')
        .eq('number', yearNumber)
        .maybeSingle();

      if (yearError) throw yearError;
      if (!year) return [];

      // Then get modules for that year
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('year_id', year.id)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Module[];
    },
    enabled: !!yearNumber,
  });
}

export function useModule(moduleIdOrSlug: string) {
  return useQuery({
    queryKey: ['module', moduleIdOrSlug],
    queryFn: async () => {
      // Try to fetch by ID first (UUID format check)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleIdOrSlug);
      
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq(isUUID ? 'id' : 'slug', moduleIdOrSlug)
        .maybeSingle();

      if (error) throw error;
      return data as Module | null;
    },
    enabled: !!moduleIdOrSlug,
  });
}

export function useModuleWithDepartments(moduleId: string) {
  return useQuery({
    queryKey: ['module-with-departments', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          module_departments (
            id,
            department_id,
            is_primary,
            departments:department_id (id, name)
          )
        `)
        .eq('id', moduleId)
        .maybeSingle();

      if (error) throw error;
      return data as ModuleWithDepartments | null;
    },
    enabled: !!moduleId,
  });
}

export function useModulesByIds(ids: string[]) {
  return useQuery({
    queryKey: ['modules-by-ids', ids],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .in('id', ids);

      if (error) throw error;
      return data as Module[];
    },
    enabled: ids.length > 0,
  });
}

// Admin mutations
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (module: Omit<Module, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('modules')
        .insert(module)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Module> & { id: string }) => {
      const { data, error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['module', data.id] });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}
