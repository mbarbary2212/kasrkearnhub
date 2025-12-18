-- Drop the security definer view and recreate with security invoker
DROP VIEW IF EXISTS public.feedback_admin_view;

-- Recreate view with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW public.feedback_admin_view 
WITH (security_invoker = true)
AS
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