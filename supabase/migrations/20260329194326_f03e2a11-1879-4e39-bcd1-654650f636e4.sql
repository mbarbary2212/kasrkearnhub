
CREATE TABLE public.assessment_chapter_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  included_in_exam boolean NOT NULL DEFAULT false,
  allow_mcq boolean NOT NULL DEFAULT false,
  allow_recall boolean NOT NULL DEFAULT false,
  allow_case boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, chapter_id)
);

ALTER TABLE public.assessment_chapter_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read eligibility"
  ON public.assessment_chapter_eligibility FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage eligibility"
  ON public.assessment_chapter_eligibility FOR ALL
  TO authenticated USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.is_any_module_admin(auth.uid())
  );

CREATE TRIGGER update_eligibility_updated_at
  BEFORE UPDATE ON public.assessment_chapter_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
