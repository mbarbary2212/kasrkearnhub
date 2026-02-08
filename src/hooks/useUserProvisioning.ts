import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserToInvite {
  email: string;
  full_name: string;
  role?: string;
  request_type?: string;
}

export interface InviteResult {
  email: string;
  status: 'success' | 'error';
  message: string;
  invited_at?: string;
}

export function useInviteSingleUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: UserToInvite) => {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'invite-single',
          user,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send invite');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: any) => {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

export function useInviteBulkUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (users: UserToInvite[]): Promise<InviteResult[]> => {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'invite-bulk',
          users,
        },
      });

      if (error) throw error;
      if (!data?.results) throw new Error('Invalid response from server');

      return data.results as InviteResult[];
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        toast.success(`All ${successCount} invitations sent successfully`);
      } else if (successCount === 0) {
        toast.error(`All ${errorCount} invitations failed`);
      } else {
        toast.warning(`${successCount} sent, ${errorCount} failed`);
      }
    },
    onError: (error: any) => {
      console.error('Error bulk inviting users:', error);
      toast.error(error.message || 'Failed to send bulk invitations');
    },
  });
}
