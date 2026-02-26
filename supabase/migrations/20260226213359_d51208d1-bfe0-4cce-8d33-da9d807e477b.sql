
-- Create ai_case_insights table for pre-computed cohort intelligence
CREATE TABLE IF NOT EXISTS public.ai_case_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.virtual_patient_cases(id) ON DELETE CASCADE,
  total_attempts integer DEFAULT 0,
  avg_score numeric(5,2) DEFAULT 0,
  common_strengths jsonb DEFAULT '[]'::jsonb,
  common_gaps jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);

-- Enable RLS
ALTER TABLE public.ai_case_insights ENABLE ROW LEVEL SECURITY;

-- Admins can read insights for cases they manage
CREATE POLICY "Admins can read ai_case_insights"
  ON public.ai_case_insights FOR SELECT
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.virtual_patient_cases c
      WHERE c.id = ai_case_insights.case_id
        AND public.is_module_admin(auth.uid(), c.module_id)
    )
  );

-- Service role needs full access for edge function upserts (handled by service key bypassing RLS)
-- No INSERT/UPDATE policy needed since edge function uses service role key
