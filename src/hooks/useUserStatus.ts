import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserStatus {
  status: 'active' | 'banned' | 'removed';
  banned_until: string | null;
  status_reason: string | null;
}

export function useUserStatus(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['user-status', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, banned_until, status_reason')
        .eq('id', userId!)
        .single();

      if (error) throw error;
      return data as UserStatus;
    },
  });

  const { isBlocked, blockMessage } = useMemo(() => {
    const status = query.data;
    if (!status) return { isBlocked: false, blockMessage: '' };

    if (status.status === 'removed') {
      return {
        isBlocked: true,
        blockMessage: 'Your account has been deactivated. Please contact support for assistance.',
      };
    }

    if (status.status === 'banned') {
      const bannedUntil = status.banned_until ? new Date(status.banned_until) : null;
      if (!bannedUntil || bannedUntil > new Date()) {
        return {
          isBlocked: true,
          blockMessage: bannedUntil
            ? `Your account has been temporarily suspended until ${bannedUntil.toLocaleDateString()}. Please contact support for assistance.`
            : 'Your account has been suspended. Please contact support for assistance.',
        };
      }
    }

    return { isBlocked: false, blockMessage: '' };
  }, [query.data]);

  return {
    userStatus: query.data ?? null,
    isBlocked,
    blockMessage,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
