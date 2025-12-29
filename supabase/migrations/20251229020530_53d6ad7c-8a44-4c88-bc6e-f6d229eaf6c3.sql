-- Fix MCQ permissions: allow Topic Admins only within assigned chapters; keep module/admin/teacher/department admin access

-- 1) Tighten module-level permission helper: remove topic_admin module-wide access
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
    -- Department admin for a department linked to this module
    EXISTS (
      SELECT 1 FROM public.module_departments md
      JOIN public.department_admins da ON da.department_id = md.department_id
      WHERE md.module_id = _module_id
        AND da.user_id = _user_id
    )
  )
$$;

-- 2) Update mcqs RLS policy to support chapter-scoped Topic Admin management
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mcqs'
      AND policyname = 'Content managers can manage mcqs'
  ) THEN
    EXECUTE 'DROP POLICY "Content managers can manage mcqs" ON public.mcqs';
  END IF;
END $$;

CREATE POLICY "Content managers can manage mcqs"
ON public.mcqs
FOR ALL
TO authenticated
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR is_module_admin(auth.uid(), module_id)
  OR EXISTS (
    SELECT 1
    FROM public.module_departments md
    WHERE md.module_id = mcqs.module_id
      AND is_department_admin(auth.uid(), md.department_id)
  )
  OR (
    -- Topic admins are allowed ONLY within assigned chapters
    has_role(auth.uid(), 'topic_admin')
    AND chapter_id IS NOT NULL
    AND is_chapter_admin(auth.uid(), chapter_id)
  )
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR is_module_admin(auth.uid(), module_id)
  OR EXISTS (
    SELECT 1
    FROM public.module_departments md
    WHERE md.module_id = mcqs.module_id
      AND is_department_admin(auth.uid(), md.department_id)
  )
  OR (
    has_role(auth.uid(), 'topic_admin')
    AND chapter_id IS NOT NULL
    AND is_chapter_admin(auth.uid(), chapter_id)
  )
);
