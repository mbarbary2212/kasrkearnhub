
-- 1) Create concepts table
CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  concept_key text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2) Unique index on concept_key
CREATE UNIQUE INDEX idx_concepts_concept_key ON public.concepts(concept_key);

-- 3) Add concept_id to content tables
ALTER TABLE public.study_resources ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.mcqs ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.osce_questions ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.clinical_cases ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.matching_questions ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.essays ADD COLUMN concept_id uuid REFERENCES public.concepts(id);
ALTER TABLE public.case_scenarios ADD COLUMN concept_id uuid REFERENCES public.concepts(id);

-- 4) Indexes on concept_id columns
CREATE INDEX idx_study_resources_concept_id ON public.study_resources(concept_id);
CREATE INDEX idx_mcqs_concept_id ON public.mcqs(concept_id);
CREATE INDEX idx_osce_questions_concept_id ON public.osce_questions(concept_id);
CREATE INDEX idx_clinical_cases_concept_id ON public.clinical_cases(concept_id);
CREATE INDEX idx_matching_questions_concept_id ON public.matching_questions(concept_id);
CREATE INDEX idx_essays_concept_id ON public.essays(concept_id);
CREATE INDEX idx_case_scenarios_concept_id ON public.case_scenarios(concept_id);

-- 5) RLS on concepts table
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read concepts
CREATE POLICY "Authenticated users can view concepts"
  ON public.concepts FOR SELECT
  TO authenticated
  USING (true);

-- Admins/teachers can insert concepts
CREATE POLICY "Admins can insert concepts"
  ON public.concepts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
    OR public.can_manage_module_content(auth.uid(), module_id)
  );

-- Admins/teachers can update concepts
CREATE POLICY "Admins can update concepts"
  ON public.concepts FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
    OR public.can_manage_module_content(auth.uid(), module_id)
  );

-- Admins can delete concepts
CREATE POLICY "Admins can delete concepts"
  ON public.concepts FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.can_manage_module_content(auth.uid(), module_id)
  );
