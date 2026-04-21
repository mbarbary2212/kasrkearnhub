import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

export interface ActivityLogPayload {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  scope?: {
    module_id?: string | null;
    chapter_id?: string | null;
    topic_id?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Fire-and-forget activity logging.
 * Logs admin actions to the activity_logs table via Edge Function.
 * Never throws - all errors are swallowed to avoid blocking operations.
 */
export async function logActivity(payload: ActivityLogPayload): Promise<void> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn('[Activity Log] No session, skipping log');
      return;
    }

    // Fire and forget - don't await the result in calling code
    fetch(
      `${SUPABASE_URL}/functions/v1/log-activity`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    ).catch((err) => {
      // Swallow network errors
      console.warn('[Activity Log] Failed to send:', err);
    });
  } catch (err) {
    // Swallow all errors
    console.warn('[Activity Log] Error:', err);
  }
}
