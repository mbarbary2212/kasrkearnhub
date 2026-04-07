-- Add rubric_json to case_scenario_questions
ALTER TABLE public.case_scenario_questions
ADD COLUMN IF NOT EXISTS rubric_json JSONB;

-- Add section_id to case_scenarios
ALTER TABLE public.case_scenarios
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id);

-- Allow admins to read all case scenarios including deleted ones
CREATE POLICY "Admins can read all case scenarios"
ON public.case_scenarios
FOR SELECT
TO authenticated
USING (
  is_platform_admin_or_higher(auth.uid())
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);