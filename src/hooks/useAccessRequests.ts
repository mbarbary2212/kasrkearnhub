import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  request_type: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useAccessRequests(status?: string) {
  return useQuery({
    queryKey: ['access-requests', status],
    queryFn: async () => {
      let query = supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AccessRequest[];
    },
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      role = 'student' 
    }: { 
      requestId: string; 
      role?: string;
    }) => {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Request not found');

      // Call the provision-user edge function
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'invite-single',
          user: {
            email: request.email,
            full_name: request.full_name,
            role: role,
          },
          source: 'access_request',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.message || 'Failed to send invite');

      // Mark request as approved
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Invite sent. Ask the user to check Spam/Junk if it doesn\'t arrive within a few minutes.');
    },
    onError: (error: any) => {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    },
  });
}

export function useRejectAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      notes 
    }: { 
      requestId: string; 
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          notes: notes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Request rejected');
    },
    onError: (error: any) => {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    },
  });
}

export function useDeleteAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('access_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Request deleted');
    },
    onError: (error: any) => {
      console.error('Error deleting request:', error);
      toast.error(error.message || 'Failed to delete request');
    },
  });
}
