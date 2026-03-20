import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, Department, DepartmentAdmin } from '@/types/database';
import type { Year, Module, ModuleAdmin } from '@/types/curriculum';

export interface UserWithRole extends Profile {
  role: AppRole;
  departmentAssignments?: DepartmentAdmin[];
  moduleAssignments?: ModuleAdmin[];
}

interface AdminData {
  users: UserWithRole[];
  departments: Department[];
  years: Year[];
  modules: Module[];
}

async function fetchAdminData(): Promise<AdminData> {
  const [
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
    { data: deptAssignments },
    { data: moduleAssignments },
    { data: depts },
    { data: yearsData },
    { data: modulesData },
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('department_admins').select('*'),
    supabase.from('module_admins').select('*'),
    supabase.from('departments').select('*').order('display_order'),
    supabase.from('years').select('*').order('display_order'),
    supabase.from('modules').select('*').order('display_order'),
  ]);

  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;

  const users: UserWithRole[] = (profiles || []).map((profile) => {
    const userRole = roles?.find((r) => r.user_id === profile.id);
    const userDeptAssignments = deptAssignments?.filter((a) => a.user_id === profile.id) || [];
    const userModuleAssignments = moduleAssignments?.filter((a) => a.user_id === profile.id) || [];
    return {
      ...profile,
      role: (userRole?.role as AppRole) || 'student',
      departmentAssignments: userDeptAssignments as DepartmentAdmin[],
      moduleAssignments: userModuleAssignments as ModuleAdmin[],
    };
  });

  return {
    users,
    departments: (depts as Department[]) || [],
    years: (yearsData as Year[]) || [],
    modules: (modulesData as Module[]) || [],
  };
}

export function useAdminData(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-data'],
    queryFn: fetchAdminData,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
