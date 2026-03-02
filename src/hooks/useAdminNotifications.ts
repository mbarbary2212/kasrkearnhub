import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface AdminNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Priority types that should appear first when unread
const PRIORITY_TYPES = ['new_access_request', 'ticket_assigned'];

function sortNotifications(notifications: AdminNotification[]): AdminNotification[] {
  return [...notifications].sort((a, b) => {
    // Unread first
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    // Among unread, priority types first
    if (!a.is_read && !b.is_read) {
      const aPriority = PRIORITY_TYPES.includes(a.type);
      const bPriority = PRIORITY_TYPES.includes(b.type);
      if (aPriority !== bPriority) return aPriority ? -1 : 1;
    }
    // Then newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export interface GroupedNotification {
  notifications: AdminNotification[];
  count: number;
  latest: AdminNotification;
}

export function groupNotifications(notifications: AdminNotification[]): GroupedNotification[] {
  const sorted = sortNotifications(notifications);
  const groups: GroupedNotification[] = [];

  for (const n of sorted) {
    // Try to find an existing group with same type+title within 60s
    const existingGroup = groups.find(g => {
      if (g.latest.type !== n.type || g.latest.title !== n.title) return false;
      const timeDiff = Math.abs(
        new Date(g.latest.created_at).getTime() - new Date(n.created_at).getTime()
      );
      return timeDiff <= 60_000;
    });

    if (existingGroup) {
      existingGroup.notifications.push(n);
      existingGroup.count++;
      // Keep latest as the most recent
      if (new Date(n.created_at) > new Date(existingGroup.latest.created_at)) {
        existingGroup.latest = n;
      }
    } else {
      groups.push({ notifications: [n], count: 1, latest: n });
    }
  }

  return groups;
}

export function useAdminNotifications() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['admin-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AdminNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['admin-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count', user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count', user?.id] });
    },
  });
}

export function useClearOldNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('recipient_id', user.id)
        .eq('is_read', true)
        .lt('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count', user?.id] });
    },
  });
}
