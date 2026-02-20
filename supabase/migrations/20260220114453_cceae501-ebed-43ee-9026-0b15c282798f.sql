
-- Add concept_ai_confidence to all 8 content tables
ALTER TABLE public.mcqs ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.osce_questions ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.matching_questions ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.study_resources ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.true_false_questions ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS concept_ai_confidence numeric NULL;
