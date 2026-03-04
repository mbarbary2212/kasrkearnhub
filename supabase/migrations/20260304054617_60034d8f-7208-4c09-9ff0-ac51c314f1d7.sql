
-- 1. Trigger function: notify on role change
CREATE OR REPLACE FUNCTION public.notify_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role_label TEXT;
BEGIN
  -- Format role name for display
  _role_label := REPLACE(INITCAP(REPLACE(NEW.role::TEXT, '_', ' ')), ' ', ' ');

  INSERT INTO public.admin_notifications (
    recipient_id, type, title, message, entity_type, entity_id, metadata
  ) VALUES (
    NEW.user_id,
    'role_changed',
    'Role Updated',
    'Your role has been updated to ' || _role_label || '.',
    'user_role',
    NEW.id,
    jsonb_build_object('new_role', NEW.role::TEXT)
  );

  RETURN NEW;
END;
$function$;

-- Attach to user_roles on INSERT or UPDATE of role column
DROP TRIGGER IF EXISTS trg_notify_user_role_change ON public.user_roles;
CREATE TRIGGER trg_notify_user_role_change
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_role_change();

-- 2. Trigger function: notify on module admin assignment
CREATE OR REPLACE FUNCTION public.notify_user_module_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _module_name TEXT;
BEGIN
  SELECT name INTO _module_name FROM public.modules WHERE id = NEW.module_id;

  INSERT INTO public.admin_notifications (
    recipient_id, type, title, message, entity_type, entity_id, metadata
  ) VALUES (
    NEW.user_id,
    'module_assigned',
    'Module Assignment',
    'You have been assigned as admin for ' || COALESCE(_module_name, 'a module') || '.',
    'module',
    NEW.module_id,
    jsonb_build_object('module_id', NEW.module_id, 'module_name', _module_name)
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_user_module_assignment ON public.module_admins;
CREATE TRIGGER trg_notify_user_module_assignment
  AFTER INSERT ON public.module_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_module_assignment();

-- 3. Trigger function: notify on topic/chapter admin assignment
CREATE OR REPLACE FUNCTION public.notify_user_topic_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _entity_name TEXT;
  _entity_label TEXT;
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    SELECT name INTO _entity_name FROM public.topics WHERE id = NEW.topic_id;
    _entity_label := 'topic';
  ELSIF NEW.chapter_id IS NOT NULL THEN
    SELECT title INTO _entity_name FROM public.module_chapters WHERE id = NEW.chapter_id;
    _entity_label := 'chapter';
  END IF;

  INSERT INTO public.admin_notifications (
    recipient_id, type, title, message, entity_type, entity_id, metadata
  ) VALUES (
    NEW.user_id,
    'topic_assigned',
    'Topic/Chapter Assignment',
    'You have been assigned as admin for ' || COALESCE(_entity_label, '') || ' ' || COALESCE(_entity_name, 'an area') || '.',
    COALESCE(_entity_label, 'topic'),
    COALESCE(NEW.topic_id, NEW.chapter_id),
    jsonb_build_object(
      'topic_id', NEW.topic_id,
      'chapter_id', NEW.chapter_id,
      'entity_name', _entity_name
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_user_topic_assignment ON public.topic_admins;
CREATE TRIGGER trg_notify_user_topic_assignment
  AFTER INSERT ON public.topic_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_topic_assignment();

-- 4. Update trigger_send_admin_email to include new types
CREATE OR REPLACE FUNCTION public.trigger_send_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _anon_key text;
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
  _anon_key := current_setting('app.settings.supabase_anon_key', true);

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
