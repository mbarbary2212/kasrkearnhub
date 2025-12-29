-- Fix mcqs write access: allow platform admins, teachers/admins, module admins, and department admins scoped to module departments

-- Replace the existing policy with a broader (still scoped) one
DROP POLICY IF EXISTS "Content managers can manage mcqs" ON public.mcqs;

CREATE POLICY "Content managers can manage mcqs" ON public.mcqs
FOR ALL
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_module_admin(auth.uid(), module_id)
  OR EXISTS (
    SELECT 1
    FROM public.module_departments md
    WHERE md.module_id = mcqs.module_id
      AND public.is_department_admin(auth.uid(), md.department_id)
  )
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_module_admin(auth.uid(), module_id)
  OR EXISTS (
    SELECT 1
    FROM public.module_departments md
    WHERE md.module_id = mcqs.module_id
      AND public.is_department_admin(auth.uid(), md.department_id)
  )
);