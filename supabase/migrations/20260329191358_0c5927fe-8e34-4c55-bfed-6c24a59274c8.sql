
-- Create chapter_component_weights table for the weight allocation matrix
CREATE TABLE public.chapter_component_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.assessment_components(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, component_id, chapter_id)
);

-- RLS
ALTER TABLE public.chapter_component_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chapter_component_weights"
  ON public.chapter_component_weights FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can manage chapter_component_weights"
  ON public.chapter_component_weights FOR ALL TO authenticated
  USING (is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Module admins can manage own chapter_component_weights"
  ON public.chapter_component_weights FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assessment_structures s
    WHERE s.id = chapter_component_weights.assessment_id
    AND is_module_admin(auth.uid(), s.module_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM assessment_structures s
    WHERE s.id = chapter_component_weights.assessment_id
    AND is_module_admin(auth.uid(), s.module_id)
  ));

-- Index for fast lookups
CREATE INDEX idx_chapter_component_weights_assessment ON public.chapter_component_weights(assessment_id);
CREATE INDEX idx_chapter_component_weights_chapter ON public.chapter_component_weights(chapter_id);
