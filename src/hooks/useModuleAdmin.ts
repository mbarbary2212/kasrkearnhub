import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useIsModuleAdmin(moduleId: string | undefined) {
  const { user, isSuperAdmin, isPlatformAdmin, isTeacher } = useAuthContext();

  const { data: isModuleAdmin, isLoading } = useQuery({
    queryKey: ['module-admin-check', moduleId, user?.id],
    queryFn: async () => {
      if (!moduleId || !user?.id) return false;
      
      // Super admin and platform admin have access to all modules
      if (isSuperAdmin || isPlatformAdmin) return true;
      
      // Check if user is a module admin
      const { data } = await supabase
        .from('module_admins')
        .select('id')
        .eq('module_id', moduleId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!moduleId && !!user?.id,
  });

  return {
    canManageContent: isModuleAdmin || isSuperAdmin || isPlatformAdmin || isTeacher,
    isModuleAdmin: isModuleAdmin ?? false,
    isLoading,
  };
}

export function useUserManagedModules() {
  const { user, isSuperAdmin, isPlatformAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['user-managed-modules', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Super admin and platform admin can see all modules
      if (isSuperAdmin || isPlatformAdmin) {
        const { data } = await supabase
          .from('modules')
          .select('id, name, slug, year_id')
          .order('name');
        return data || [];
      }
      
      // Module admins see only their assigned modules
      const { data } = await supabase
        .from('module_admins')
        .select('module_id, modules(id, name, slug, year_id)')
        .eq('user_id', user.id);
      
      return data?.map(d => d.modules).filter(Boolean) || [];
    },
    enabled: !!user?.id,
  });
}
