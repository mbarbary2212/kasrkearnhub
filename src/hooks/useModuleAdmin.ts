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
    canManageContent: isModuleAdmin || isSuperAdmin || isPlatformAdmin,
    isModuleAdmin: isModuleAdmin ?? false,
    isLoading,
  };
}

export function useAllModulesWithPermissions() {
  const { user, isSuperAdmin, isPlatformAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['all-modules-with-permissions', user?.id, isSuperAdmin, isPlatformAdmin],
    queryFn: async () => {
      if (!user?.id) return { modules: [], editableIds: new Set<string>() };

      // Fetch all modules
      const { data: modules } = await supabase
        .from('modules')
        .select('id, name, slug, year_id, display_order, is_published, image_url')
        .order('display_order', { ascending: true });

      const allModules = (modules || []) as Array<{
        id: string; name: string; slug: string; year_id: string;
        display_order: number | null; is_published: boolean | null; image_url: string | null;
      }>;

      // Super/platform admins can edit everything
      if (isSuperAdmin || isPlatformAdmin) {
        return {
          modules: allModules,
          editableIds: new Set(allModules.map(m => m.id)),
        };
      }

      // Fetch user's module_admins entries
      const { data: adminEntries } = await supabase
        .from('module_admins')
        .select('module_id')
        .eq('user_id', user.id);

      const editableIds = new Set((adminEntries || []).map(e => e.module_id));

      return { modules: allModules, editableIds };
    },
    enabled: !!user?.id,
  });
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
