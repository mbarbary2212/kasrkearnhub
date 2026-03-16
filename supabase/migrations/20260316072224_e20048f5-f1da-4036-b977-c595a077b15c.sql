-- Add feature column to coach_usage with default for existing rows
ALTER TABLE public.coach_usage
ADD COLUMN feature text NOT NULL DEFAULT 'study_coach';

-- Drop existing unique constraint (user_id, question_date)
ALTER TABLE public.coach_usage
DROP CONSTRAINT IF EXISTS coach_usage_user_id_question_date_key;

-- Create new unique constraint including feature
ALTER TABLE public.coach_usage
ADD CONSTRAINT coach_usage_user_id_question_date_feature_key UNIQUE (user_id, question_date, feature);