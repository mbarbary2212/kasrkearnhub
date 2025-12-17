import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, DepartmentAdmin } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  departmentAssignments: DepartmentAdmin[];
  isLoading: boolean;
}

// Role hierarchy levels
const ROLE_LEVELS: Record<AppRole, number> = {
  student: 10,
  teacher: 25,
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
    isLoading: true,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch department assignments for department admins
      let departmentAssignments: DepartmentAdmin[] = [];
      if (roleData?.role === 'department_admin') {
        const { data: assignments } = await supabase
          .from('department_admins')
          .select('*')
          .eq('user_id', userId);
        departmentAssignments = (assignments as DepartmentAdmin[]) || [];
      }

      setState(prev => ({
        ...prev,
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) || 'student',
        departmentAssignments,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            profile: null,
            role: null,
            departmentAssignments: [],
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
        setState(prev => ({ ...prev, isLoading: false }));
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

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasRole,
    canManageDepartment,
    // Role checks
    isSuperAdmin: state.role === 'super_admin',
    isPlatformAdmin: state.role === 'platform_admin' || state.role === 'super_admin',
    isDepartmentAdmin: state.role === 'department_admin',
    isAdmin: state.role === 'admin' || state.role === 'department_admin' || state.role === 'platform_admin' || state.role === 'super_admin',
    isTeacher: state.role === 'teacher' || state.role === 'admin' || state.role === 'department_admin' || state.role === 'platform_admin' || state.role === 'super_admin',
    isStudent: !!state.role,
  };
}
