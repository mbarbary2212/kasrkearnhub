
-- =============================================
-- Admin Email Preferences table
-- =============================================
CREATE TABLE public.admin_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_access_requests boolean NOT NULL DEFAULT true,
  notify_new_feedback boolean NOT NULL DEFAULT true,
  notify_new_inquiries boolean NOT NULL DEFAULT true,
  notify_ticket_assigned boolean NOT NULL DEFAULT true,
  notify_new_content boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own row
CREATE POLICY "Users can view own email preferences"
  ON public.admin_email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email preferences"
  ON public.admin_email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email preferences"
  ON public.admin_email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_admin_email_preferences_updated_at
  BEFORE UPDATE ON public.admin_email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- pg_net trigger on admin_notifications INSERT
-- to call send-admin-email edge function
-- =============================================
CREATE OR REPLACE FUNCTION public.trigger_send_admin_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _url text;
  _anon_key text;
BEGIN
  -- Only send emails for specific notification types
  IF NEW.type NOT IN (
    'new_access_request',
    'new_feedback',
    'new_inquiry',
    'ticket_assigned',
    'content_activity'
  ) THEN
    RETURN NEW;
  END IF;

  -- Build the edge function URL
  _url := 'https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/send-admin-email';
  _anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Use pg_net to POST asynchronously
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bXhub2twcmZpd212emtzeWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjM3NjQsImV4cCI6MjA4MTQ5OTc2NH0.wGf_n_j8hOIXCRzd2fV_-Zy0suHEY1vI4ggFaU-f6oo'
    ),
    body := jsonb_build_object(
      'recipient_user_id', NEW.recipient_id,
      'type', NEW.type,
      'notification_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_admin_notification_send_email
  AFTER INSERT ON public.admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_admin_email();
