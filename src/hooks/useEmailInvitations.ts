import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AccountStatus = 'not_registered' | 'registered' | 'active';

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
  account_status: AccountStatus;
  last_sign_in_at: string | null;
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

      // Filter to only show direct invitations (not access request approvals)
      const directInvitations = invitations.filter(inv => {
        const metadata = inv.metadata as Record<string, unknown> | null;
        const source = (metadata?.source as string) || 'direct';
        return source === 'direct';
      });

      if (directInvitations.length === 0) return [];

      // Get all unique emails
      const emails = directInvitations
        .map(i => {
          const metadata = i.metadata as Record<string, unknown> | null;
          return (metadata?.email as string)?.toLowerCase();
        })
        .filter(Boolean) as string[];

      if (emails.length === 0) return [];

      // Fetch delivery status and account status in parallel
      const [eventsResult, statusResult] = await Promise.all([
        supabase
          .from('email_events')
          .select('*')
          .in('to_email', emails),
        supabase.functions.invoke('provision-user', {
          body: { action: 'check-invite-status', users: [...new Set(emails)] },
        }),
      ]);

      // Create a map of latest event per email
      const eventMap = new Map<string, { event_type: string; reason: string | null; created_at: string }>();
      eventsResult.data?.forEach(e => {
        const existing = eventMap.get(e.to_email);
        if (!existing || new Date(e.created_at!) > new Date(existing.created_at)) {
          eventMap.set(e.to_email, {
            event_type: e.event_type,
            reason: e.reason,
            created_at: e.created_at!,
          });
        }
      });

      // Create account status map
      const statusMap = new Map<string, { account_status: AccountStatus; last_sign_in_at: string | null }>();
      if (statusResult.data?.statuses) {
        statusResult.data.statuses.forEach((s: any) => {
          statusMap.set(s.email.toLowerCase(), {
            account_status: s.account_status,
            last_sign_in_at: s.last_sign_in_at,
          });
        });
      }

      // Merge invitations with delivery status and account status
      return directInvitations.map(inv => {
        const metadata = inv.metadata as Record<string, unknown> | null;
        const email = (metadata?.email as string) || '';
        const status = statusMap.get(email.toLowerCase());
        
        return {
          id: inv.id,
          email,
          full_name: (metadata?.full_name as string) || '',
          role: (metadata?.role as string) || 'student',
          is_new_user: Boolean(metadata?.is_new_user),
          invited_at: inv.created_at,
          actor_id: inv.actor_id,
          delivery: eventMap.get(email.toLowerCase()) || null,
          account_status: status?.account_status || 'not_registered',
          last_sign_in_at: status?.last_sign_in_at || null,
        };
      });
    },
  });
}
