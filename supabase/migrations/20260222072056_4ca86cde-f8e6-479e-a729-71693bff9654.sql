
ALTER TABLE public.osce_questions ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.osce_questions ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.study_resources ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.study_resources ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.mcqs ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.mcqs ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.mcq_sets ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.mcq_sets ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.practicals ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.practicals ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.matching_questions ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.matching_questions ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.true_false_questions ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.true_false_questions ADD COLUMN IF NOT EXISTS original_section_number TEXT;

ALTER TABLE public.virtual_patient_cases ADD COLUMN IF NOT EXISTS original_section_name TEXT;
ALTER TABLE public.virtual_patient_cases ADD COLUMN IF NOT EXISTS original_section_number TEXT;
