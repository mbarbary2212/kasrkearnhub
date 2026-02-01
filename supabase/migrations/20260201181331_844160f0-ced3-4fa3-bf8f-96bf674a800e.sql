-- =============================================
-- Study Coach: Usage tracking + AI settings
-- =============================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table to track daily coach usage per student
CREATE TABLE public.coach_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, question_date)
);

-- Enable RLS
ALTER TABLE public.coach_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own coach usage" 
  ON public.coach_usage 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_coach_usage_user_date ON public.coach_usage(user_id, question_date);

-- Trigger for updated_at
CREATE TRIGGER update_coach_usage_updated_at
  BEFORE UPDATE ON public.coach_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add Study Coach settings to ai_settings table
INSERT INTO public.ai_settings (key, value, description) VALUES
  ('study_coach_enabled', 'true', 'Enable/disable Study Coach feature for all users'),
  ('study_coach_daily_limit', '5', 'Daily question limit per student (admins have unlimited)'),
  ('study_coach_provider', '"lovable"', 'AI provider for Study Coach: "lovable" or "gemini"'),
  ('study_coach_model', '"google/gemini-3-flash-preview"', 'Model to use for Study Coach'),
  ('study_coach_disabled_message', '"The study coach is currently disabled by the course administrators due to usage limits. Please use your course materials and send questions via Feedback & Inquiries."', 'Message shown when coach is disabled')
ON CONFLICT (key) DO NOTHING;