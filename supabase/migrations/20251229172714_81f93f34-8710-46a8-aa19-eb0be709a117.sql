-- Drop existing restrictive policy for essays
DROP POLICY IF EXISTS "Content managers can manage essays" ON public.essays;

-- Create new policy that handles chapter-level, module-level, and topic-level permissions
CREATE POLICY "Content managers can manage essays" 
ON public.essays 
FOR ALL 
USING (
  -- Platform admins, teachers, and admins can always manage
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  -- Chapter-level check (when chapter_id is set)
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  -- Module-level check (when module_id is set)
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  -- Topic-level check via department admin
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = essays.topic_id AND da.user_id = auth.uid()
  ))
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = essays.topic_id AND da.user_id = auth.uid()
  ))
);

-- Also fix the same pattern for practicals, clinical_cases, lectures, and resources
DROP POLICY IF EXISTS "Content managers can manage practicals" ON public.practicals;
CREATE POLICY "Content managers can manage practicals" 
ON public.practicals 
FOR ALL 
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = practicals.topic_id AND da.user_id = auth.uid()
  ))
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = practicals.topic_id AND da.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Content managers can manage lectures" ON public.lectures;
CREATE POLICY "Content managers can manage lectures" 
ON public.lectures 
FOR ALL 
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = lectures.topic_id AND da.user_id = auth.uid()
  ))
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = lectures.topic_id AND da.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Content managers can manage resources" ON public.resources;
CREATE POLICY "Content managers can manage resources" 
ON public.resources 
FOR ALL 
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = resources.topic_id AND da.user_id = auth.uid()
  ))
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = resources.topic_id AND da.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Content managers can manage clinical_cases" ON public.clinical_cases;
CREATE POLICY "Content managers can manage clinical_cases" 
ON public.clinical_cases 
FOR ALL 
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = clinical_cases.topic_id AND da.user_id = auth.uid()
  ))
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR (module_id IS NOT NULL AND can_manage_module_content(auth.uid(), module_id))
  OR (topic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = clinical_cases.topic_id AND da.user_id = auth.uid()
  ))
);