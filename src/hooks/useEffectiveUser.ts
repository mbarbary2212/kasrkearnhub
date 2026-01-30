import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpersonationState {
  isImpersonating: boolean;
  effectiveUserId: string | null;
  effectiveUserName: string | null;
  effectiveUserEmail: string | null;
  sessionId: string | null;
  expiresAt: Date | null;
}

interface EffectiveUserState {
  // Real user ID (always the logged-in admin)
  userId: string | null;
  // Effective user ID (student if impersonating, else same as userId)
  effectiveUserId: string | null;
  // Impersonation status (Mode A - Super Admin only)
  isImpersonating: boolean;
  effectiveUserName: string | null;
  effectiveUserEmail: string | null;
  sessionId: string | null;
  expiresAt: Date | null;
  // Actions for impersonation
  startImpersonation: (targetUserId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  // Preview Student UI mode (Mode B - All admins)
  isPreviewStudentUI: boolean;
  togglePreviewStudentUI: () => void;
  // Loading state
  isLoading: boolean;
  // Support mode flag (writes blocked during impersonation OR preview)
  isSupportMode: boolean;
  // UI should render as student (preview or impersonation)
  isEffectivelyStudent: boolean;
}

const SUPABASE_URL = 'https://dwmxnokprfiwmvzksyjg.supabase.co';

/**
 * Central hook for impersonation and preview mode state management.
 * 
 * Two modes:
 * - Mode A (Impersonation): Super Admin only, selects real student, sees their data
 * - Mode B (Preview UI): All admins, toggles to student UI with demo/empty data
 * 
 * - effectiveUserId = studentId when impersonating (Mode A)
 * - effectiveUserId = user.id when in preview mode (Mode B) - NOT null
 * - isSupportMode = true when either mode is active (blocks writes)
 */
export function useEffectiveUser(): EffectiveUserState {
  const { user, isAdmin, isSuperAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  
  // Mode B: Preview Student UI (local state, no server interaction)
  const [isPreviewStudentUI, setIsPreviewStudentUI] = useState(false);

  // Query impersonation state via edge function - enabled for all admins
  const { data: impersonationState, isLoading: isQueryLoading } = useQuery({
    queryKey: ['impersonation-state', user?.id],
    queryFn: async (): Promise<ImpersonationState> => {
      if (!user?.id) {
        return getEmptyState();
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          return getEmptyState();
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/get-impersonation-state`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          console.warn('[Impersonation] Failed to fetch state:', response.status);
          return getEmptyState();
        }

        const data = await response.json();
        
        return {
          isImpersonating: data.isImpersonating || false,
          effectiveUserId: data.effectiveUserId || null,
          effectiveUserName: data.effectiveUserName || null,
          effectiveUserEmail: data.effectiveUserEmail || null,
          sessionId: data.sessionId || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        };
      } catch (error) {
        console.error('[Impersonation] Error fetching state:', error);
        return getEmptyState();
      }
    },
    enabled: !!user?.id && isAdmin,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 30000,
  });

  // Mode A: Start impersonation (Super Admin only - enforced server-side)
  const startImpersonation = useCallback(async (targetUserId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    if (!isSuperAdmin) {
      toast.error('Only Super Admins can impersonate students');
      return;
    }

    setIsStarting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/start-impersonation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ targetUserId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to start impersonation');
        return;
      }

      // Exit preview mode if active when starting impersonation
      if (isPreviewStudentUI) {
        setIsPreviewStudentUI(false);
      }

      toast.success(`Now viewing as ${data.effectiveUserName || 'student'} (View-Only Mode)`);
      
      // Invalidate queries to refresh UI with new effective user
      queryClient.invalidateQueries({ queryKey: ['impersonation-state'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
      queryClient.invalidateQueries({ queryKey: ['question-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
    } catch (error) {
      console.error('[Impersonation] Start error:', error);
      toast.error('Failed to start impersonation');
    } finally {
      setIsStarting(false);
    }
  }, [user?.id, isSuperAdmin, isPreviewStudentUI, queryClient]);

  const endImpersonation = useCallback(async () => {
    if (!user?.id) return;

    setIsEnding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expired');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/end-impersonation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to end impersonation');
        return;
      }

      toast.success('Returned to admin view');
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['impersonation-state'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-progress'] });
      queryClient.invalidateQueries({ queryKey: ['question-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
    } catch (error) {
      console.error('[Impersonation] End error:', error);
      toast.error('Failed to end impersonation');
    } finally {
      setIsEnding(false);
    }
  }, [user?.id, queryClient]);

  // Mode B: Toggle Preview Student UI (local state only)
  const togglePreviewStudentUI = useCallback(() => {
    setIsPreviewStudentUI(prev => {
      const newValue = !prev;
      if (newValue) {
        toast.info('Entered Student UI Preview - Demo Mode');
      } else {
        toast.success('Exited Student UI Preview');
      }
      return newValue;
    });
  }, []);

  // Derived values
  const isImpersonating = impersonationState?.isImpersonating ?? false;
  
  // effectiveUserId logic:
  // - If impersonating: use the student's ID
  // - If preview mode: keep user's own ID (NOT null)
  // - Otherwise: user's ID
  const effectiveUserId = isImpersonating 
    ? impersonationState?.effectiveUserId 
    : user?.id ?? null;

  // Support mode blocks writes in BOTH impersonation AND preview modes
  const isSupportMode = isImpersonating || isPreviewStudentUI;
  
  // UI should render as student experience in preview or impersonation
  const isEffectivelyStudent = isPreviewStudentUI || isImpersonating;

  return {
    userId: user?.id ?? null,
    effectiveUserId,
    isImpersonating,
    effectiveUserName: impersonationState?.effectiveUserName ?? null,
    effectiveUserEmail: impersonationState?.effectiveUserEmail ?? null,
    sessionId: impersonationState?.sessionId ?? null,
    expiresAt: impersonationState?.expiresAt ?? null,
    startImpersonation,
    endImpersonation,
    isPreviewStudentUI,
    togglePreviewStudentUI,
    isLoading: isQueryLoading || isStarting || isEnding,
    isSupportMode,
    isEffectivelyStudent,
  };
}

function getEmptyState(): ImpersonationState {
  return {
    isImpersonating: false,
    effectiveUserId: null,
    effectiveUserName: null,
    effectiveUserEmail: null,
    sessionId: null,
    expiresAt: null,
  };
}
