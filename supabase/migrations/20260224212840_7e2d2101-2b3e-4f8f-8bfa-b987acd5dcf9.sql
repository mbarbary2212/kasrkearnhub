CREATE POLICY "Admins can view all algorithms"
ON public.interactive_algorithms
FOR SELECT
USING (
  can_manage_module_content(auth.uid(), module_id)
  OR (chapter_id IS NOT NULL 
      AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR created_by = auth.uid()
);