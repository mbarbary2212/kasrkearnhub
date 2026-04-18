import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, Department, DepartmentAdmin } from '@/types/database';
import type { Year, Module, ModuleAdmin } from '@/types/curriculum';

export interface UserWithRole extends Profile {
  role: AppRole;
  departmentAssignments?: DepartmentAdmin[];
  moduleAssignments?: ModuleAdmin[];
}

interface AdminReferenceData {
  departments: Department[];
  years: Year[];
  modules: Module[];
}

interface AdminUsersData {
  users: UserWithRole[];
}

interface AdminData extends AdminReferenceData, AdminUsersData {}

// Slim, fast — small reference tables only. Used to render the Admin tabs shell.
async function fetchAdminReferenceData(): Promise<AdminReferenceData> {
  const [
    { data: depts, error: deptsError },
    { data: yearsData, error: yearsError },
    { data: modulesData, error: modulesError },
  ] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    supabase.from('years').select('*').order('display_order'),
    supabase.from('modules').select('*').order('display_order'),
  ]);

  if (deptsError) throw deptsError;
  if (yearsError) throw yearsError;
  if (modulesError) throw modulesError;

  return {
    departments: (depts as Department[]) || [],
    years: (yearsData as Year[]) || [],
    modules: (modulesData as Module[]) || [],
  };
}

// The expensive one — only call this when the Users tab is mounted.
async function fetchAdminUsers(): Promise<AdminUsersData> {
  const formatErr = (label: string, err: any) =>
    `[useAdminUsers] ${label} query failed: ${err?.message || 'unknown error'}` +
    (err?.code ? ` (code: ${err.code})` : '') +
    (err?.details ? ` | details: ${err.details}` : '') +
    (err?.hint ? ` | hint: ${err.hint}` : '');

  const [
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
    { data: deptAssignments, error: deptError },
    { data: moduleAssignments, error: moduleError },
  ] = await Promise.all([
    // Reverted to select('*') — slim select caused HTTP 500 because of a column-name mismatch.
    // Verified column list now in hand; will re-slim in a follow-up.
    supabase
      .from('profiles')
      .select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('department_admins').select('*'),
    supabase.from('module_admins').select('*'),
  ]);

  if (profilesError) throw new Error(formatErr('profiles', profilesError));
  if (rolesError) throw new Error(formatErr('user_roles', rolesError));
  if (deptError) throw new Error(formatErr('department_admins', deptError));
  if (moduleError) throw new Error(formatErr('module_admins', moduleError));

  const users: UserWithRole[] = (profiles || []).map((profile) => {
    const userRole = roles?.find((r) => r.user_id === profile.id);
    const userDeptAssignments = deptAssignments?.filter((a) => a.user_id === profile.id) || [];
    const userModuleAssignments = moduleAssignments?.filter((a) => a.user_id === profile.id) || [];
    return {
      ...(profile as Profile),
      role: (userRole?.role as AppRole) || 'student',
      departmentAssignments: userDeptAssignments as DepartmentAdmin[],
      moduleAssignments: userModuleAssignments as ModuleAdmin[],
    };
  });

  const result = { users };
  console.log('[useAdminUsers] fetched:', result);
  return result;
}

export function useAdminReferenceData(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-reference-data'],
    queryFn: fetchAdminReferenceData,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// Backward-compat: combines both queries into the original { users, departments, years, modules } shape.
// Existing consumers and `queryClient.invalidateQueries({ queryKey: ['admin-data'] })` calls keep working,
// but new code should prefer the targeted hooks above.
export function useAdminData(enabled: boolean) {
  const reference = useAdminReferenceData(enabled);
  const usersQuery = useAdminUsers(enabled);

  const data: AdminData | undefined =
    reference.data && usersQuery.data
      ? {
          users: usersQuery.data.users,
          departments: reference.data.departments,
          years: reference.data.years,
          modules: reference.data.modules,
        }
      : undefined;

  return {
    data,
    isLoading: reference.isLoading || usersQuery.isLoading,
    isError: reference.isError || usersQuery.isError,
    error: reference.error || usersQuery.error,
    refetch: async () => {
      await Promise.all([reference.refetch(), usersQuery.refetch()]);
    },
  };
}
