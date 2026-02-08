import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailInvitation {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_new_user: boolean;
  invited_at: string;
  actor_id: string;
  delivery: {
    event_type: string;
    reason: string | null;
    created_at: string;
  } | null;
}

export function useEmailInvitations() {
  return useQuery({
    queryKey: ['email-invitations'],
    queryFn: async (): Promise<EmailInvitation[]> => {
      // Get invitations from audit_log
      const { data: invitations, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('action', 'USER_INVITED')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!invitations || invitations.length === 0) return [];

      // Get all unique emails
      const emails = invitations
        .map(i => {
          const metadata = i.metadata as Record<string, unknown> | null;
          return (metadata?.email as string)?.toLowerCase();
        })
        .filter(Boolean);

      if (emails.length === 0) return [];

      // Get delivery status for these emails
      const { data: events } = await supabase
        .from('email_events')
        .select('*')
        .in('to_email', emails);

      // Create a map of latest event per email
      const eventMap = new Map<string, { event_type: string; reason: string | null; created_at: string }>();
      events?.forEach(e => {
        const existing = eventMap.get(e.to_email);
        if (!existing || new Date(e.created_at!) > new Date(existing.created_at)) {
          eventMap.set(e.to_email, {
            event_type: e.event_type,
            reason: e.reason,
            created_at: e.created_at!,
          });
        }
      });

      // Merge invitations with delivery status
      return invitations.map(inv => {
        const metadata = inv.metadata as Record<string, unknown> | null;
        const email = (metadata?.email as string) || '';
        
        return {
          id: inv.id,
          email,
          full_name: (metadata?.full_name as string) || '',
          role: (metadata?.role as string) || 'student',
          is_new_user: Boolean(metadata?.is_new_user),
          invited_at: inv.created_at,
          actor_id: inv.actor_id,
          delivery: eventMap.get(email.toLowerCase()) || null,
        };
      });
    },
  });
}
