import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface EmailPreferences {
  id: string;
  user_id: string;
  notify_access_requests: boolean;
  notify_new_feedback: boolean;
  notify_new_inquiries: boolean;
  notify_ticket_assigned: boolean;
  notify_new_content: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULTS = {
  notify_access_requests: true,
  notify_new_feedback: true,
  notify_new_inquiries: true,
  notify_ticket_assigned: true,
  notify_new_content: false,
};

export function useEmailPreferences() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['email-preferences', user?.id],
    queryFn: async (): Promise<EmailPreferences> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Try to fetch existing
      const { data, error } = await supabase
        .from('admin_email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) return data as EmailPreferences;

      // Auto-create defaults
      const { data: inserted, error: insertError } = await supabase
        .from('admin_email_preferences')
        .insert({ user_id: user.id, ...DEFAULTS })
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted as EmailPreferences;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (patch: Partial<Pick<EmailPreferences,
      'notify_access_requests' | 'notify_new_feedback' | 'notify_new_inquiries' |
      'notify_ticket_assigned' | 'notify_new_content'
    >>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_email_preferences')
        .update(patch)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences', user?.id] });
    },
  });
}
