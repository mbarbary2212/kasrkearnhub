-- Create enum for feedback category
CREATE TYPE public.feedback_category AS ENUM (
  'bug',
  'content_error', 
  'suggestion',
  'complaint',
  'academic_integrity',
  'other'
);

-- Create enum for feedback severity
CREATE TYPE public.feedback_severity AS ENUM (
  'normal',
  'urgent',
  'extreme'
);

-- Create enum for feedback status
CREATE TYPE public.feedback_status AS ENUM (
  'new',
  'in_review',
  'closed'
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  category feedback_category NOT NULL,
  severity feedback_severity NOT NULL DEFAULT 'normal',
  year_id UUID REFERENCES public.years(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  tab TEXT,
  message TEXT NOT NULL CHECK (char_length(message) >= 20),
  screenshot_url TEXT,
  status feedback_status NOT NULL DEFAULT 'new',
  admin_notes TEXT
);

-- Create feedback_unmask_requests table
CREATE TABLE public.feedback_unmask_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  revealed_user_id UUID
);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_severity ON public.feedback(severity);
CREATE INDEX idx_feedback_created_by ON public.feedback(created_by);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_unmask_requests_feedback ON public.feedback_unmask_requests(feedback_id);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_unmask_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create a view for admins that hides created_by
CREATE VIEW public.feedback_admin_view AS
SELECT 
  id,
  created_at,
  role,
  category,
  severity,
  year_id,
  module_id,
  topic_id,
  chapter_id,
  tab,
  message,
  screenshot_url,
  status,
  admin_notes
FROM public.feedback;

-- RLS Policies for feedback table

-- Students/Faculty can insert feedback
CREATE POLICY "Authenticated users can submit feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  (role = 'student' OR role = 'faculty' OR role = 'teacher')
);

-- Users can view their own feedback (optional)
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Admin/SuperAdmin can view feedback (but should use the view)
CREATE POLICY "Admins can view all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  is_platform_admin_or_higher(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admin/SuperAdmin can update feedback status and notes
CREATE POLICY "Admins can update feedback"
ON public.feedback
FOR UPDATE
TO authenticated
USING (
  is_platform_admin_or_higher(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for feedback_unmask_requests

-- Only superadmins can create unmask requests
CREATE POLICY "SuperAdmins can create unmask requests"
ON public.feedback_unmask_requests
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- SuperAdmins can view unmask requests
CREATE POLICY "SuperAdmins can view unmask requests"
ON public.feedback_unmask_requests
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- SuperAdmins can update unmask requests (for approval)
CREATE POLICY "SuperAdmins can update unmask requests"
ON public.feedback_unmask_requests
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for audit_log

-- Only platform admins can view audit logs
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (is_platform_admin_or_higher(auth.uid()));

-- System can insert audit logs (via function)
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Create function to check daily feedback submission limit
CREATE OR REPLACE FUNCTION public.get_user_feedback_count_today(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.feedback
  WHERE created_by = _user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;

-- Create function to reveal feedback identity (SuperAdmin only, extreme severity only)
CREATE OR REPLACE FUNCTION public.reveal_feedback_identity(
  _feedback_id UUID,
  _reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _feedback_severity TEXT;
  _feedback_creator UUID;
  _request_id UUID;
BEGIN
  _caller_id := auth.uid();
  
  -- Check caller is super_admin
  IF NOT is_super_admin(_caller_id) THEN
    RAISE EXCEPTION 'Only super admins can reveal feedback identity';
  END IF;
  
  -- Check reason is provided
  IF _reason IS NULL OR char_length(_reason) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 characters) is required';
  END IF;
  
  -- Get feedback details
  SELECT severity::TEXT, created_by
  INTO _feedback_severity, _feedback_creator
  FROM public.feedback
  WHERE id = _feedback_id;
  
  IF _feedback_creator IS NULL THEN
    RAISE EXCEPTION 'Feedback not found or creator unknown';
  END IF;
  
  -- Check severity is extreme
  IF _feedback_severity != 'extreme' THEN
    RAISE EXCEPTION 'Identity can only be revealed for extreme severity feedback';
  END IF;
  
  -- Create unmask request record
  INSERT INTO public.feedback_unmask_requests (
    feedback_id,
    requested_by,
    reason,
    approved,
    approved_at,
    approved_by,
    revealed_user_id
  )
  VALUES (
    _feedback_id,
    _caller_id,
    _reason,
    true,
    now(),
    _caller_id,
    _feedback_creator
  )
  RETURNING id INTO _request_id;
  
  -- Log to audit
  PERFORM log_audit_event(
    'UNMASK_REVEAL',
    'feedback',
    _feedback_id,
    jsonb_build_object(
      'reason', _reason,
      'revealed_user_id', _feedback_creator,
      'unmask_request_id', _request_id
    )
  );
  
  RETURN _feedback_creator;
END;
$$;