
CREATE TABLE public.material_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  material_type text NOT NULL,
  material_id uuid NOT NULL,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  feedback_type text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_feedback_material ON public.material_feedback (material_type, material_id);
CREATE INDEX idx_material_feedback_chapter ON public.material_feedback (chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX idx_material_feedback_status ON public.material_feedback (status);

ALTER TABLE public.material_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.material_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Users can insert own feedback"
  ON public.material_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON public.material_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
