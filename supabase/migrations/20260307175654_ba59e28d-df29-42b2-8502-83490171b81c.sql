CREATE OR REPLACE FUNCTION public.trigger_send_admin_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text;
BEGIN
  IF NEW.type NOT IN (
    'new_access_request',
    'new_feedback',
    'new_inquiry',
    'ticket_assigned',
    'content_activity',
    'role_changed',
    'module_assigned',
    'topic_assigned'
  ) THEN
    RETURN NEW;
  END IF;

  _url := 'https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/send-admin-email';

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
$function$;