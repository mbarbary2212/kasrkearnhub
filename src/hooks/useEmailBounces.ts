import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailEvent {
  id: string;
  resend_email_id: string | null;
  to_email: string;
  event_type: string;
  status: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useEmailBounces() {
  return useQuery({
    queryKey: ['email-bounces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .in('event_type', ['email.bounced', 'email.complained'])
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as EmailEvent[];
    },
  });
}

export function useEmailBouncesByEmail(emails: string[]) {
  return useQuery({
    queryKey: ['email-bounces-by-email', emails],
    queryFn: async () => {
      if (!emails.length) return {};
      
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .in('event_type', ['email.bounced', 'email.complained'])
        .in('to_email', emails.map(e => e.toLowerCase()))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by email, keeping latest event per email
      const bounceMap: Record<string, EmailEvent> = {};
      for (const event of (data || []) as EmailEvent[]) {
        if (!bounceMap[event.to_email]) {
          bounceMap[event.to_email] = event;
        }
      }
      return bounceMap;
    },
    enabled: emails.length > 0,
  });
}
