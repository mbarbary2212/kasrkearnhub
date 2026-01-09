import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleDepartment {
  id: string;
  module_id: string;
  department_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface ModuleDepartmentWithDetails extends ModuleDepartment {
  departments: {
    id: string;
    name: string;
  };
}

// Fetch departments for a specific module
export function useModuleDepartments(moduleId: string) {
  return useQuery({
    queryKey: ['module-departments', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_departments')
        .select(`
          *,
          departments:department_id (id, name)
        `)
        .eq('module_id', moduleId);

      if (error) throw error;
      return data as ModuleDepartmentWithDetails[];
    },
    enabled: !!moduleId,
  });
}

// Fetch all module-department relationships
export function useAllModuleDepartments() {
  return useQuery({
    queryKey: ['all-module-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_departments')
        .select(`
          *,
          departments:department_id (id, name)
        `);

      if (error) throw error;
      return data as ModuleDepartmentWithDetails[];
    },
  });
}

export interface UpdateModuleDepartmentsData {
  moduleId: string;
  departmentIds: string[];
  primaryDepartmentId: string | null;
}

// Update module departments (delete old, insert new)
export function useUpdateModuleDepartments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, departmentIds, primaryDepartmentId }: UpdateModuleDepartmentsData) => {
      // Delete existing relationships
      const { error: deleteError } = await supabase
        .from('module_departments')
        .delete()
        .eq('module_id', moduleId);

      if (deleteError) throw deleteError;

      // Insert new relationships
      if (departmentIds.length > 0) {
        const inserts = departmentIds.map(deptId => ({
          module_id: moduleId,
          department_id: deptId,
          is_primary: deptId === primaryDepartmentId,
        }));

        const { error: insertError } = await supabase
          .from('module_departments')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return { moduleId, departmentIds, primaryDepartmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['module-departments', data.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['all-module-departments'] });
      queryClient.invalidateQueries({ queryKey: ['module-with-departments'] });
    },
  });
}
