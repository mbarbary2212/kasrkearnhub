-- Drop and recreate the SELECT policy to include topic_admin
DROP POLICY IF EXISTS "Admins can view help files" ON public.admin_help_files;

CREATE POLICY "Admins can view help files" 
ON public.admin_help_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY[
      'topic_admin'::app_role,
      'department_admin'::app_role, 
      'platform_admin'::app_role, 
      'super_admin'::app_role,
      'admin'::app_role,
      'teacher'::app_role
    ])
  )
);