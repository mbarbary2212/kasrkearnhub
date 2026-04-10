import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, DepartmentAdmin, TopicAdmin, ModuleAdmin } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  departmentAssignments: DepartmentAdmin[];
  topicAssignments: TopicAdmin[];
  moduleAssignments: ModuleAdmin[];
  isLoading: boolean;
  initialLoading: boolean;
}

// Role hierarchy levels
const ROLE_LEVELS: Record<AppRole, number> = {
  student: 10,
  teacher: 25,
  topic_admin: 35,
  admin: 50,
  department_admin: 50,
  platform_admin: 75,
  super_admin: 100,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    departmentAssignments: [],
    topicAssignments: [],
    moduleAssignments: [],
    isLoading: true,
    initialLoading: true,
  });

  const queryClient = useQueryClient();

  // Deduplicate concurrent fetchUserData calls
  const fetchInFlightRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // Skip if already fetching for this user
    if (fetchInFlightRef.current === userId) return;
    fetchInFlightRef.current = userId;

    // Ensure isLoading is true while fetching role data (prevents false permission denials on reload)
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Parallel fetch: profile, role, and module assignments
      const [profileResult, roleResult, moduleAdminResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('module_admins').select('*').eq('user_id', userId),
      ]);

      const profile = profileResult.data as Profile | null;
      const role = (roleResult.data?.role as AppRole) || 'student';
      const moduleAssignments = (moduleAdminResult.data as ModuleAdmin[]) || [];

      // Conditional fetches based on role (only if needed)
      let departmentAssignments: DepartmentAdmin[] = [];
      let topicAssignments: TopicAdmin[] = [];

      if (role === 'department_admin') {
        const { data } = await supabase.from('department_admins').select('*').eq('user_id', userId);
        departmentAssignments = (data as DepartmentAdmin[]) || [];
      } else if (role === 'topic_admin') {
        const { data } = await supabase.from('topic_admins').select('*').eq('user_id', userId);
        topicAssignments = (data as TopicAdmin[]) || [];
      }

      // Set Sentry user context for error reporting
      if (profile) {
        Sentry.setUser({
          id: profile.id,
          email: profile.email || undefined,
          username: profile.full_name || undefined,
        });
      }

      setState(prev => ({
        ...prev,
        profile,
        role,
        departmentAssignments,
        topicAssignments,
        moduleAssignments,
        isLoading: false,
        initialLoading: false,
      }));

      Sentry.setUser({ id: userId, role: roleResult.data?.role ?? undefined });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    } finally {
      fetchInFlightRef.current = null;
    }
  }, []);

  // Optimistically merge partial profile updates into local state
  const patchProfile = useCallback((updates: Partial<Profile>) => {
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...updates } : prev.profile,
    }));
  }, []);

  // Re-fetch profile & role from server
  const refreshProfile = useCallback(() => {
    if (state.user) {
      fetchUserData(state.user.id);
    }
  }, [state.user, fetchUserData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          // Only set isLoading true if we don't already have a user (prevents unmount on token refresh)
          isLoading: !!session?.user && !prev.user,
        }));

        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          queryClient.clear();
          Sentry.setUser(null);
          setState(prev => ({
            ...prev,
            profile: null,
            role: null,
            departmentAssignments: [],
            topicAssignments: [],
            moduleAssignments: [],
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false, initialLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  // Check if user has at least the required role level
  const hasRole = (requiredRole: AppRole): boolean => {
    if (!state.role) return false;
    return ROLE_LEVELS[state.role] >= ROLE_LEVELS[requiredRole];
  };

  // Check if user can manage a specific department
  const canManageDepartment = (departmentId: string): boolean => {
    if (!state.role) return false;
    
    // Platform admin and super admin can manage all departments
    if (state.role === 'platform_admin' || state.role === 'super_admin') {
      return true;
    }
    
    // Department admin can only manage assigned departments
    if (state.role === 'department_admin') {
      return state.departmentAssignments.some(a => a.department_id === departmentId);
    }
    
    // Legacy admin and teacher can manage content
    if (state.role === 'admin' || state.role === 'teacher') {
      return true;
    }
    
    return false;
  };

  // Check if user can manage a specific topic
  const canManageTopic = (topicId: string): boolean => {
    if (!state.role) return false;
    
    // Platform admin and super admin can manage all topics
    if (state.role === 'platform_admin' || state.role === 'super_admin') {
      return true;
    }
    
    // Topic admin can only manage assigned topics
    if (state.role === 'topic_admin') {
      return state.topicAssignments.some(a => a.topic_id === topicId);
    }
    
    // Department admin, legacy admin and teacher can manage content
    if (state.role === 'department_admin' || state.role === 'admin' || state.role === 'teacher') {
      return true;
    }
    
    return false;
  };

  // Check if user can manage a specific chapter
  const canManageChapter = (chapterId: string): boolean => {
    if (!state.role) return false;
    
    // Platform admin and super admin can manage all chapters
    if (state.role === 'platform_admin' || state.role === 'super_admin') {
      return true;
    }
    
    // Topic admin can only manage assigned chapters
    if (state.role === 'topic_admin') {
      return state.topicAssignments.some(a => a.chapter_id === chapterId);
    }
    
    // Department admin, legacy admin and teacher can manage content
    if (state.role === 'department_admin' || state.role === 'admin' || state.role === 'teacher') {
      return true;
    }
    
    return false;
  };

  // Check if user can manage a specific module
  const canManageModule = (moduleId: string): boolean => {
    if (!state.role) return false;
    
    // Platform admin and super admin can manage all modules
    if (state.role === 'platform_admin' || state.role === 'super_admin') {
      return true;
    }
    
    // Legacy admin and teacher can manage content
    if (state.role === 'admin' || state.role === 'teacher') {
      return true;
    }
    
    // Check if user has module admin assignment for this specific module
    if (state.moduleAssignments.some(a => a.module_id === moduleId)) {
      return true;
    }
    
    return false;
  };

  // Check if user is a module admin (has any module assignments)
  const isModuleAdminRole = state.moduleAssignments.length > 0;

  // Get module IDs for module admin
  const moduleAdminModuleIds = state.moduleAssignments.map(a => a.module_id);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasRole,
    patchProfile,
    refreshProfile,
    canManageDepartment,
    canManageTopic,
    canManageChapter,
    canManageModule,
    moduleAdminModuleIds,
    // Role checks
    isSuperAdmin: state.role === 'super_admin',
    isPlatformAdmin: state.role === 'platform_admin' || state.role === 'super_admin',
    isDepartmentAdmin: state.role === 'department_admin',
    isTopicAdmin: state.role === 'topic_admin',
    isModuleAdmin: isModuleAdminRole,
    isAdmin: state.role === 'admin' || state.role === 'department_admin' || state.role === 'platform_admin' || state.role === 'super_admin' || state.role === 'topic_admin' || isModuleAdminRole,
    isTeacher: state.role === 'teacher',
    isStudent: state.role === 'student',
  };
}
