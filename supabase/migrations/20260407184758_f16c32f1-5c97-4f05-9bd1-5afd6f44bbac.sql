
-- Add reasoning_domain to case_scenario_questions
ALTER TABLE public.case_scenario_questions
ADD COLUMN IF NOT EXISTS reasoning_domain TEXT;

-- Create case_attempt_details table
CREATE TABLE public.case_attempt_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.case_scenarios(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.case_scenario_questions(id) ON DELETE CASCADE,
  chapter_id UUID,
  topic_id UUID,
  module_id UUID,
  reasoning_domain TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  missing_critical_points JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_attempt_details ENABLE ROW LEVEL SECURITY;

-- Users can read their own attempts
CREATE POLICY "Users read own case attempts"
ON public.case_attempt_details
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "Users insert own case attempts"
ON public.case_attempt_details
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Performance indexes
CREATE INDEX idx_case_attempt_details_user ON public.case_attempt_details(user_id);
CREATE INDEX idx_case_attempt_details_domain ON public.case_attempt_details(user_id, reasoning_domain);
CREATE INDEX idx_case_attempt_details_chapter ON public.case_attempt_details(user_id, chapter_id);

-- Trigger to mark readiness cache stale on new case attempt
CREATE OR REPLACE FUNCTION public.mark_readiness_stale_on_case_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.chapter_id IS NOT NULL THEN
    UPDATE public.student_readiness_cache
    SET is_stale = true
    WHERE user_id = NEW.user_id
      AND chapter_id = NEW.chapter_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_case_attempt_readiness_stale
AFTER INSERT ON public.case_attempt_details
FOR EACH ROW
EXECUTE FUNCTION public.mark_readiness_stale_on_case_attempt();
