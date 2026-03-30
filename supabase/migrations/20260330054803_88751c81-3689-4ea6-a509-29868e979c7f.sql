
-- Chapter blueprint config: defines per-chapter component profiles
CREATE TABLE public.chapter_blueprint_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  inclusion_level text NOT NULL DEFAULT 'average' CHECK (inclusion_level IN ('high', 'average', 'low')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, assessment_id, component_type)
);

-- RLS
ALTER TABLE public.chapter_blueprint_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chapter_blueprint_config"
  ON public.chapter_blueprint_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage chapter_blueprint_config"
  ON public.chapter_blueprint_config FOR ALL TO authenticated
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.is_module_admin(auth.uid(), module_id)
  )
  WITH CHECK (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.is_module_admin(auth.uid(), module_id)
  );

-- Updated_at trigger
CREATE TRIGGER update_chapter_blueprint_config_updated_at
  BEFORE UPDATE ON public.chapter_blueprint_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
