-- Create admin_notifications table for approval workflow notifications
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.admin_notifications
FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.admin_notifications
FOR UPDATE
USING (auth.uid() = recipient_id);

-- System can insert notifications (through functions)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- Update announcements RLS to allow module admins to create with pending_approval
DROP POLICY IF EXISTS "Module admins can manage module announcements" ON public.announcements;

-- Module admins can create announcements (including pending ones for "all" target)
CREATE POLICY "Module admins can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  is_module_admin(auth.uid(), module_id)
  OR is_platform_admin_or_higher(auth.uid())
);

-- Module admins can update/delete their OWN module announcements (not pending "all" ones)
CREATE POLICY "Module admins can update own module announcements"
ON public.announcements
FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    created_by = auth.uid()
    AND module_id IS NOT NULL
    AND is_module_admin(auth.uid(), module_id)
    AND (target_type = 'module' OR pending_approval = true)
  )
);

CREATE POLICY "Module admins can delete own module announcements"
ON public.announcements
FOR DELETE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    created_by = auth.uid()
    AND module_id IS NOT NULL
    AND is_module_admin(auth.uid(), module_id)
  )
);

-- Add rejection fields to announcements
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create function to notify super admins when announcement needs approval
CREATE OR REPLACE FUNCTION notify_super_admins_pending_announcement()
RETURNS TRIGGER AS $$
DECLARE
  super_admin RECORD;
  creator_name TEXT;
BEGIN
  -- Only trigger for new pending announcements
  IF NEW.pending_approval = true THEN
    -- Get creator name
    SELECT COALESCE(full_name, email) INTO creator_name
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    -- Notify all super admins and platform admins
    FOR super_admin IN 
      SELECT DISTINCT user_id 
      FROM public.user_roles 
      WHERE role IN ('super_admin', 'platform_admin')
    LOOP
      INSERT INTO public.admin_notifications (
        recipient_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        super_admin.user_id,
        'announcement_pending_approval',
        'Announcement Pending Approval',
        'A new announcement "' || NEW.title || '" from ' || COALESCE(creator_name, 'Unknown') || ' requires your approval.',
        'announcement',
        NEW.id,
        jsonb_build_object(
          'announcement_title', NEW.title,
          'created_by', NEW.created_by,
          'creator_name', creator_name
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for pending announcement notifications
DROP TRIGGER IF EXISTS trigger_notify_pending_announcement ON public.announcements;
CREATE TRIGGER trigger_notify_pending_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION notify_super_admins_pending_announcement();

-- Create function to notify module admin when announcement decision is made
CREATE OR REPLACE FUNCTION notify_announcement_decision()
RETURNS TRIGGER AS $$
DECLARE
  decision_maker_name TEXT;
BEGIN
  -- Check if this is an approval (pending changed from true to false)
  IF OLD.pending_approval = true AND NEW.pending_approval = false AND NEW.rejected_at IS NULL THEN
    -- Get decision maker name
    SELECT COALESCE(full_name, email) INTO decision_maker_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Notify the announcement creator
    IF OLD.created_by IS NOT NULL THEN
      INSERT INTO public.admin_notifications (
        recipient_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        OLD.created_by,
        'announcement_approved',
        'Announcement Approved',
        'Your announcement "' || NEW.title || '" has been approved and is now visible to students.',
        'announcement',
        NEW.id,
        jsonb_build_object(
          'announcement_title', NEW.title,
          'approved_by', auth.uid(),
          'approver_name', decision_maker_name
        )
      );
    END IF;
  END IF;
  
  -- Check if this is a rejection
  IF NEW.rejected_at IS NOT NULL AND OLD.rejected_at IS NULL THEN
    -- Get decision maker name
    SELECT COALESCE(full_name, email) INTO decision_maker_name
    FROM public.profiles
    WHERE id = NEW.rejected_by;
    
    -- Notify the announcement creator
    IF OLD.created_by IS NOT NULL THEN
      INSERT INTO public.admin_notifications (
        recipient_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        OLD.created_by,
        'announcement_rejected',
        'Announcement Rejected',
        'Your announcement "' || NEW.title || '" was not approved. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided'),
        'announcement',
        NEW.id,
        jsonb_build_object(
          'announcement_title', NEW.title,
          'rejected_by', NEW.rejected_by,
          'rejector_name', decision_maker_name,
          'rejection_reason', NEW.rejection_reason
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for announcement decision notifications
DROP TRIGGER IF EXISTS trigger_notify_announcement_decision ON public.announcements;
CREATE TRIGGER trigger_notify_announcement_decision
AFTER UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION notify_announcement_decision();