
-- Function to notify admins about new pending access requests
CREATE OR REPLACE FUNCTION public.notify_admins_new_access_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only notify on new pending requests
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Insert a notification for each super_admin and platform_admin
  FOR admin_record IN
    SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'platform_admin')
  LOOP
    INSERT INTO admin_notifications (recipient_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      admin_record.user_id,
      'new_access_request',
      'New Access Request',
      format('%s (%s) has requested access as %s',
        NEW.full_name,
        NEW.email,
        COALESCE(NEW.request_type, 'student')),
      'access_request',
      NEW.id,
      jsonb_build_object(
        'full_name', NEW.full_name,
        'email', NEW.email,
        'request_type', NEW.request_type,
        'job_title', NEW.job_title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on insert
CREATE TRIGGER on_new_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_access_request();
