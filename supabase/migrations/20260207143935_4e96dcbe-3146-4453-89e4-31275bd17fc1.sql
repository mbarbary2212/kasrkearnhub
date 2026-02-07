-- 1. Create admin_replies table for in-app replies
CREATE TABLE public.admin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT NOT NULL CHECK (thread_type IN ('feedback', 'inquiry')),
  thread_id UUID NOT NULL,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_replies_thread ON admin_replies(thread_type, thread_id);
CREATE INDEX idx_admin_replies_created ON admin_replies(created_at DESC);
CREATE INDEX idx_admin_replies_unread ON admin_replies(is_read) WHERE is_read = false;

ALTER TABLE admin_replies ENABLE ROW LEVEL SECURITY;

-- 2. Create secured view for anonymous feedback (hides user_id for module admins)
CREATE VIEW public.item_feedback_admin_view
WITH (security_invoker = on) AS
SELECT 
  id,
  module_id,
  chapter_id,
  item_type,
  item_id,
  rating,
  category,
  message,
  is_anonymous,
  is_flagged,
  status,
  admin_notes,
  resolved_by,
  resolved_at,
  created_at
FROM public.item_feedback;

-- 3. Drop existing module admin policies that expose user_id
DROP POLICY IF EXISTS "Module admins can view module feedback" ON public.item_feedback;
DROP POLICY IF EXISTS "Module admins can update module feedback" ON public.item_feedback;

-- 4. Update item_feedback RLS policies

-- Super admins can view all feedback with user_id
CREATE POLICY "Super admins can view all feedback with identity"
ON public.item_feedback FOR SELECT
USING (is_super_admin(auth.uid()));

-- Platform admins can view all feedback with user_id
CREATE POLICY "Platform admins can view all feedback"
ON public.item_feedback FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- Admins can update feedback (status, notes, flags)
CREATE POLICY "Admins can update feedback"
ON public.item_feedback FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  is_platform_admin_or_higher(auth.uid()) OR
  is_module_admin(auth.uid(), module_id)
);

-- 5. Create Security Definer Function for Module Admin Feedback Access
CREATE OR REPLACE FUNCTION get_module_feedback_for_admin(_module_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  module_id UUID,
  chapter_id UUID,
  item_type TEXT,
  item_id UUID,
  rating INTEGER,
  category TEXT,
  message TEXT,
  is_anonymous BOOLEAN,
  is_flagged BOOLEAN,
  status TEXT,
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is module admin, platform admin, or super admin
  IF NOT (
    is_super_admin(auth.uid()) OR
    is_platform_admin_or_higher(auth.uid()) OR
    (_module_id IS NOT NULL AND is_module_admin(auth.uid(), _module_id)) OR
    is_any_module_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to view feedback';
  END IF;

  RETURN QUERY
  SELECT 
    f.id, f.module_id, f.chapter_id, f.item_type, f.item_id,
    f.rating, f.category, f.message, f.is_anonymous, f.is_flagged,
    f.status, f.admin_notes, f.resolved_by, f.resolved_at, f.created_at
  FROM item_feedback_admin_view f
  WHERE (_module_id IS NULL OR f.module_id = _module_id)
  ORDER BY f.created_at DESC;
END;
$$;

-- 6. RLS Policies for admin_replies

-- Students can read replies to their own threads
CREATE POLICY "Students can read own replies"
ON admin_replies FOR SELECT
USING (
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback WHERE id = thread_id AND user_id = auth.uid()
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries WHERE id = thread_id AND user_id = auth.uid()
  ))
);

-- Students can UPDATE their own replies to mark as read
CREATE POLICY "Students can mark own replies as read"
ON admin_replies FOR UPDATE
USING (
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback WHERE id = thread_id AND user_id = auth.uid()
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries WHERE id = thread_id AND user_id = auth.uid()
  ))
)
WITH CHECK (
  is_read = true
);

-- Admins can insert replies
CREATE POLICY "Admins can insert replies"
ON admin_replies FOR INSERT
WITH CHECK (
  auth.uid() = admin_id AND (
    is_platform_admin_or_higher(auth.uid()) OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'teacher') OR
    (thread_type = 'feedback' AND EXISTS (
      SELECT 1 FROM item_feedback f WHERE f.id = thread_id AND is_module_admin(auth.uid(), f.module_id)
    )) OR
    (thread_type = 'inquiry' AND EXISTS (
      SELECT 1 FROM inquiries i WHERE i.id = thread_id AND is_module_admin(auth.uid(), i.module_id)
    ))
  )
);

-- Admins can read all replies for threads they have access to
CREATE POLICY "Admins can read all replies"
ON admin_replies FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid()) OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'teacher') OR
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback f WHERE f.id = thread_id AND is_module_admin(auth.uid(), f.module_id)
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries i WHERE i.id = thread_id AND is_module_admin(auth.uid(), i.module_id)
  ))
);