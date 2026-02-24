-- Drop and recreate UPDATE policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can update algorithms" ON public.interactive_algorithms;

CREATE POLICY "Admins can update algorithms"
ON public.interactive_algorithms
FOR UPDATE
USING (
  can_manage_module_content(auth.uid(), module_id)
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
)
WITH CHECK (
  can_manage_module_content(auth.uid(), module_id)
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
);

-- Also add a dedicated soft-delete policy that's more permissive for the creator
DROP POLICY IF EXISTS "Admins can delete algorithms" ON public.interactive_algorithms;

CREATE POLICY "Admins can delete algorithms"
ON public.interactive_algorithms
FOR DELETE
USING (
  can_manage_module_content(auth.uid(), module_id)
  OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR created_by = auth.uid()
);