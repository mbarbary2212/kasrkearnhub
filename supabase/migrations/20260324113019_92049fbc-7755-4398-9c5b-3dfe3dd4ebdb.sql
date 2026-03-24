
-- Add ai_confidence column (0-10 scale) to all content tables
ALTER TABLE public.mcqs ADD COLUMN IF NOT EXISTS ai_confidence SMALLINT DEFAULT NULL;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS ai_confidence SMALLINT DEFAULT NULL;
ALTER TABLE public.osce_questions ADD COLUMN IF NOT EXISTS ai_confidence SMALLINT DEFAULT NULL;
ALTER TABLE public.matching_questions ADD COLUMN IF NOT EXISTS ai_confidence SMALLINT DEFAULT NULL;
ALTER TABLE public.virtual_patient_cases ADD COLUMN IF NOT EXISTS ai_confidence SMALLINT DEFAULT NULL;

-- Add check constraints to ensure values are 0-10
ALTER TABLE public.mcqs ADD CONSTRAINT mcqs_ai_confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 10);
ALTER TABLE public.essays ADD CONSTRAINT essays_ai_confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 10);
ALTER TABLE public.osce_questions ADD CONSTRAINT osce_ai_confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 10);
ALTER TABLE public.matching_questions ADD CONSTRAINT matching_ai_confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 10);
ALTER TABLE public.virtual_patient_cases ADD CONSTRAINT vpc_ai_confidence_range CHECK (ai_confidence >= 0 AND ai_confidence <= 10);
