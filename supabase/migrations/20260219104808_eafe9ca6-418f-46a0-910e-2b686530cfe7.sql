
-- Phase 1b: Create one stage per migrated case (already inserted in Phase 1)
-- Use 'read_only' stage_type which is valid
INSERT INTO public.virtual_patient_stages (
  case_id, stage_order, stage_type, prompt, 
  correct_answer, explanation, teaching_points, choices
)
SELECT 
  vpc.id,
  1,
  'read_only',
  cs.case_questions,
  to_jsonb(cs.model_answer),
  NULL,
  ARRAY[]::text[],
  '[]'::jsonb
FROM public.virtual_patient_cases vpc
JOIN public.case_scenarios cs ON cs.id = vpc.legacy_case_scenario_id
WHERE vpc.legacy_case_scenario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.virtual_patient_stages vps 
    WHERE vps.case_id = vpc.id
  );

-- Phase 2: Drop clinical_cases table (0 records, no active UI)
DROP TABLE IF EXISTS public.clinical_cases CASCADE;
