import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { PermissionRequiredDialog } from "@/components/permissions/PermissionRequiredDialog";

export type PermissionScope = {
  moduleId?: string;
  topicId?: string | null;
  chapterId?: string | null;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function joinList(items: string[] | undefined, fallback: string) {
  const cleaned = (items || []).map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return fallback;
  if (cleaned.length === 1) return cleaned[0];
  return cleaned.join(", ");
}

function getRoleLabel(auth: ReturnType<typeof useAuthContext>) {
  if (auth.isSuperAdmin) return "Super Admin";
  if (auth.isPlatformAdmin) return "Platform Admin";
  if (auth.isDepartmentAdmin) return "Department Admin";
  if (auth.isTopicAdmin) return "Topic Admin";
  if (auth.isModuleAdmin) return "Module Admin";
  if (auth.role === "admin") return "Admin";
  if (auth.role === "teacher") return "Teacher";
  return "User";
}

async function fetchModuleName(moduleId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("name")
    .eq("id", moduleId)
    .maybeSingle();

  if (error) throw error;
  return data?.name ?? "this module";
}

async function fetchModulesNames(moduleIds: string[]) {
  if (moduleIds.length === 0) return [] as string[];

  const { data, error } = await supabase
    .from("modules")
    .select("id, name")
    .in("id", moduleIds);

  if (error) throw error;
  return (data || []).map((m) => m.name).filter(Boolean);
}

async function fetchDepartmentsNames(departmentIds: string[]) {
  if (departmentIds.length === 0) return [] as string[];

  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .in("id", departmentIds);

  if (error) throw error;
  return (data || []).map((d) => d.name).filter(Boolean);
}

async function fetchCanManageScope(args: {
  userId: string;
  moduleId?: string;
  topicId?: string | null;
  chapterId?: string | null;
}) {
  const { userId, moduleId, topicId, chapterId } = args;

  if (chapterId) {
    const { data, error } = await supabase.rpc("can_manage_chapter_content", {
      _chapter_id: chapterId,
      _user_id: userId,
    });
    if (error) throw error;
    return !!data;
  }

  if (topicId) {
    const { data, error } = await supabase.rpc("can_manage_topic_content", {
      _topic_id: topicId,
      _user_id: userId,
    });
    if (error) throw error;
    return !!data;
  }

  if (moduleId) {
    const { data, error } = await supabase.rpc("can_manage_module_content", {
      _module_id: moduleId,
      _user_id: userId,
    });
    if (error) throw error;
    return !!data;
  }

  return false;
}

export function useAddPermissionGuard(scope: PermissionScope) {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const roleLabel = useMemo(() => getRoleLabel(auth), [auth]);

  const targetModuleId = scope.moduleId;

  const { data: targetModuleLabel } = useQuery({
    queryKey: ["module-name", targetModuleId],
    queryFn: () => fetchModuleName(targetModuleId as string),
    enabled: !!targetModuleId,
  });

  const allowedScopeIds = useMemo(() => {
    if (auth.isDepartmentAdmin) {
      return {
        kind: "departments" as const,
        ids: uniq(auth.departmentAssignments.map((a) => a.department_id)),
      };
    }

    if (auth.isTopicAdmin) {
      return {
        kind: "modules" as const,
        ids: uniq(auth.topicAssignments.map((a) => a.module_id).filter(Boolean) as string[]),
      };
    }

    if (auth.isModuleAdmin) {
      return { kind: "modules" as const, ids: uniq(auth.moduleAdminModuleIds) };
    }

    return { kind: "none" as const, ids: [] as string[] };
  }, [
    auth.isDepartmentAdmin,
    auth.isTopicAdmin,
    auth.isModuleAdmin,
    auth.departmentAssignments,
    auth.topicAssignments,
    auth.moduleAdminModuleIds,
  ]);

  const { data: allowedScopeNames } = useQuery({
    queryKey: ["allowed-scope-names", auth.user?.id, allowedScopeIds.kind, allowedScopeIds.ids],
    queryFn: async () => {
      if (allowedScopeIds.kind === "departments") return fetchDepartmentsNames(allowedScopeIds.ids);
      if (allowedScopeIds.kind === "modules") return fetchModulesNames(allowedScopeIds.ids);
      return [];
    },
    enabled: !!auth.user?.id && allowedScopeIds.ids.length > 0,
  });

  const allowedScopeLabel = useMemo(() => {
    if (auth.isSuperAdmin || auth.isPlatformAdmin) return "all modules";
    if (auth.role === "teacher" || auth.role === "admin") return "all modules";

    if (allowedScopeIds.kind === "departments") {
      return joinList(allowedScopeNames, "your department");
    }

    if (allowedScopeIds.kind === "modules") {
      return joinList(allowedScopeNames, "your assigned module");
    }

    return "your assigned scope";
  }, [
    auth.isSuperAdmin,
    auth.isPlatformAdmin,
    auth.role,
    allowedScopeIds.kind,
    allowedScopeNames,
  ]);

  const canManageQueryKey = useMemo(
    () => ["can-manage-add", scope.moduleId, scope.topicId, scope.chapterId, auth.user?.id],
    [scope.moduleId, scope.topicId, scope.chapterId, auth.user?.id],
  );

  const canManageEnabled = !!auth.user?.id && (!!scope.moduleId || !!scope.topicId || !!scope.chapterId);

  const canManageQueryFn = useCallback(() => {
    return fetchCanManageScope({
      userId: auth.user!.id,
      moduleId: scope.moduleId,
      topicId: scope.topicId,
      chapterId: scope.chapterId,
    });
  }, [auth.user, scope.moduleId, scope.topicId, scope.chapterId]);

  const { data: canManage = false, isLoading: isCheckingPermission } = useQuery({
    queryKey: canManageQueryKey,
    queryFn: canManageQueryFn,
    enabled: canManageEnabled,
  });

  const guard = useCallback(
    async (onAllowed: () => void) => {
      // Not logged in: block.
      if (!auth.user?.id) {
        setOpen(true);
        return;
      }

      // Global roles: allow.
      if (auth.isSuperAdmin || auth.isPlatformAdmin || auth.role === "teacher" || auth.role === "admin") {
        onAllowed();
        return;
      }

      // Ensure we check server-side permission (matches RLS logic).
      const allowed = await queryClient.fetchQuery({
        queryKey: canManageQueryKey,
        queryFn: canManageQueryFn,
      });

      if (allowed) {
        onAllowed();
      } else {
        setOpen(true);
      }
    },
    [
      auth.user?.id,
      auth.isSuperAdmin,
      auth.isPlatformAdmin,
      auth.role,
      queryClient,
      canManageQueryKey,
      canManageQueryFn,
    ],
  );

  const dialog = (
    <PermissionRequiredDialog
      open={open}
      onOpenChange={setOpen}
      roleLabel={roleLabel}
      allowedScopeLabel={allowedScopeLabel}
      targetModuleLabel={targetModuleLabel || "this module"}
    />
  );

  return {
    guard,
    dialog,
    canManage,
    isCheckingPermission,
  };
}
