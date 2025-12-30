-- Add pending_approval column for announcements that need super admin approval
ALTER TABLE public.announcements 
ADD COLUMN pending_approval boolean NOT NULL DEFAULT false;

-- Add a comment to explain the column
COMMENT ON COLUMN public.announcements.pending_approval IS 'When true, the announcement needs super admin approval before becoming visible. Used for "all users" announcements created by module admins.';

-- Update RLS policy to allow module admins to view announcements for their modules
-- First drop the existing policy that restricts viewing
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;

-- Create new policy that allows viewing active non-pending announcements OR pending ones if you're an admin
CREATE POLICY "Anyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (
  (is_active = true AND pending_approval = false AND ((expires_at IS NULL) OR (expires_at > now())))
  OR is_platform_admin_or_higher(auth.uid())
  OR (module_id IS NOT NULL AND is_module_admin(auth.uid(), module_id))
);

-- Allow module admins to insert announcements for their modules
DROP POLICY IF EXISTS "Module admins can manage module announcements" ON public.announcements;

CREATE POLICY "Module admins can manage module announcements" 
ON public.announcements 
FOR ALL 
USING (
  (module_id IS NOT NULL AND is_module_admin(auth.uid(), module_id))
)
WITH CHECK (
  (module_id IS NOT NULL AND is_module_admin(auth.uid(), module_id))
);