ALTER TABLE public.student_goals
  ADD COLUMN IF NOT EXISTS daily_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ambition_hint_dismissed boolean NOT NULL DEFAULT false;