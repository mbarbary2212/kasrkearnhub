import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserAdminActions() {
  const queryClient = useQueryClient();

  const banUser = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      reason, 
      bannedUntil 
    }: { 
      targetUserId: string; 
      reason: string; 
      bannedUntil?: string | null;
    }) => {
      const { error } = await supabase.rpc('admin_ban_user', {
        _target_user_id: targetUserId,
        _reason: reason,
        _banned_until: bannedUntil || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User has been suspended');
      queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend user');
    },
  });

  const unbanUser = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      reason 
    }: { 
      targetUserId: string; 
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('admin_unban_user', {
        _target_user_id: targetUserId,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User suspension has been lifted');
      queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to lift suspension');
    },
  });

  const removeUser = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      reason 
    }: { 
      targetUserId: string; 
      reason: string;
    }) => {
      const { error } = await supabase.rpc('admin_remove_user', {
        _target_user_id: targetUserId,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User has been deactivated');
      queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to deactivate user');
    },
  });

  const restoreUser = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      reason 
    }: { 
      targetUserId: string; 
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('admin_restore_user', {
        _target_user_id: targetUserId,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User has been restored');
      queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore user');
    },
  });

  return {
    banUser,
    unbanUser,
    removeUser,
    restoreUser,
  };
}
