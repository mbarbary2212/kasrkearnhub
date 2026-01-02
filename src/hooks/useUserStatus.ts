import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStatus {
  status: 'active' | 'banned' | 'removed';
  banned_until: string | null;
  status_reason: string | null;
}

export function useUserStatus(userId: string | null | undefined) {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, banned_until, status_reason')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user status:', error);
        setLoading(false);
        return;
      }

      const status = data as UserStatus;
      setUserStatus(status);

      // Check if user is blocked
      if (status.status === 'removed') {
        setIsBlocked(true);
        setBlockMessage('Your account has been deactivated. Please contact support for assistance.');
      } else if (status.status === 'banned') {
        const bannedUntil = status.banned_until ? new Date(status.banned_until) : null;
        if (!bannedUntil || bannedUntil > new Date()) {
          setIsBlocked(true);
          if (bannedUntil) {
            setBlockMessage(`Your account has been temporarily suspended until ${bannedUntil.toLocaleDateString()}. Please contact support for assistance.`);
          } else {
            setBlockMessage('Your account has been suspended. Please contact support for assistance.');
          }
        } else {
          // Ban has expired
          setIsBlocked(false);
        }
      } else {
        setIsBlocked(false);
      }
    } catch (err) {
      console.error('User status check error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { userStatus, isBlocked, blockMessage, loading, refetch: checkStatus };
}
