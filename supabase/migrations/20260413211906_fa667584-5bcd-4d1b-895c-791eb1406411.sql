
-- Create student_goals table
CREATE TABLE public.student_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ambition_level text,
  weekday_hours numeric,
  weekend_hours numeric,
  exam_schedule jsonb DEFAULT '[]'::jsonb,
  rotation_schedule jsonb DEFAULT '[]'::jsonb,
  goals_onboarding_shown boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- Students can only manage their own goals
CREATE POLICY "Users can view own goals"
  ON public.student_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own goals"
  ON public.student_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own goals"
  ON public.student_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_student_goals_updated_at
  BEFORE UPDATE ON public.student_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
