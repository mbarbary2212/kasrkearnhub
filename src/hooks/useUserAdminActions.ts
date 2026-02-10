import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserAdminActions() {
  const queryClient = useQueryClient();

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
  };

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
      invalidateUsers();
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
      invalidateUsers();
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
      invalidateUsers();
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
      invalidateUsers();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore user');
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ 
      email, 
      fullName,
      userId 
    }: { 
      email: string; 
      fullName?: string;
      userId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'reset-password',
          user: { email, full_name: fullName, user_id: userId },
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to send reset email');
      return data;
    },
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send reset email');
    },
  });

  const updateEmail = useMutation({
    mutationFn: async ({ 
      userId, 
      newEmail 
    }: { 
      userId: string; 
      newEmail: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'update-email',
          user: { user_id: userId, new_email: newEmail },
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to update email');
      return data;
    },
    onSuccess: () => {
      toast.success('Email updated successfully');
      invalidateUsers();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async ({ 
      userId, 
      mode, 
      reason 
    }: { 
      userId: string; 
      mode: 'soft' | 'hard'; 
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'delete-user',
          user: { user_id: userId, mode, reason },
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to delete user');
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.mode === 'hard' ? 'User permanently deleted' : 'User deactivated');
      invalidateUsers();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  return {
    banUser,
    unbanUser,
    removeUser,
    restoreUser,
    resetPassword,
    updateEmail,
    deleteUser,
  };
}
