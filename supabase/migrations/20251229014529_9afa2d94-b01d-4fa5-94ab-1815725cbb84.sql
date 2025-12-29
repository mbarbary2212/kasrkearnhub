
-- Update can_manage_module_content to include topic_admins with chapter or module assignments
CREATE OR REPLACE FUNCTION public.can_manage_module_content(_user_id uuid, _module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    -- Super admin or platform admin
    is_platform_admin_or_higher(_user_id)
    OR
    -- Module admin
    is_module_admin(_user_id, _module_id)
    OR
    -- Teacher or admin role
    has_role(_user_id, 'teacher') OR has_role(_user_id, 'admin')
    OR
    -- Topic admin with module-level or chapter-level assignment for this module
    EXISTS (
      SELECT 1 FROM public.topic_admins ta
      WHERE ta.user_id = _user_id
        AND ta.module_id = _module_id
    )
    OR
    -- Department admin for a department linked to this module
    EXISTS (
      SELECT 1 FROM public.module_departments md
      JOIN public.department_admins da ON da.department_id = md.department_id
      WHERE md.module_id = _module_id
        AND da.user_id = _user_id
    )
  )
$$;
