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
  // Impersonation status
  isImpersonating: boolean;
  effectiveUserName: string | null;
  effectiveUserEmail: string | null;
  sessionId: string | null;
  expiresAt: Date | null;
  // Actions
  startImpersonation: (targetUserId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  // Loading state
  isLoading: boolean;
  // Support mode flag (writes blocked during impersonation)
  isSupportMode: boolean;
}

const SUPABASE_URL = 'https://dwmxnokprfiwmvzksyjg.supabase.co';

/**
 * Central hook for impersonation state management.
 * - Never queries impersonation_sessions directly
 * - All operations go through Edge Functions
 * - Provides effectiveUserId for data hooks
 * - isSupportMode = true when impersonating (blocks writes)
 */
export function useEffectiveUser(): EffectiveUserState {
  const { user, isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

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

  const startImpersonation = useCallback(async (targetUserId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    if (!isAdmin) {
      toast.error('Only admins can impersonate students');
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
  }, [user?.id, isAdmin, queryClient]);

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

  // Derived values
  const isImpersonating = impersonationState?.isImpersonating ?? false;
  const effectiveUserId = isImpersonating 
    ? impersonationState?.effectiveUserId 
    : user?.id ?? null;

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
    isLoading: isQueryLoading || isStarting || isEnding,
    isSupportMode: isImpersonating,
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
