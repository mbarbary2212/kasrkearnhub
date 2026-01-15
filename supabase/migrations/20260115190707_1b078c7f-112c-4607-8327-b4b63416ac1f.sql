-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can manage study_resources" ON public.study_resources;

-- Create new policy that includes topic/chapter admins and teachers
CREATE POLICY "Admins can manage study_resources"
ON public.study_resources
FOR ALL
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR can_manage_module_content(auth.uid(), module_id)
  OR can_manage_chapter_content(auth.uid(), chapter_id)
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR can_manage_module_content(auth.uid(), module_id)
  OR can_manage_chapter_content(auth.uid(), chapter_id)
);