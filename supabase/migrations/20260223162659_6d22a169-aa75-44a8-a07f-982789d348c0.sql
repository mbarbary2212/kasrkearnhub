
ALTER TABLE public.essays ADD COLUMN question_type text;
ALTER TABLE public.essays ADD COLUMN rubric_json jsonb;
ALTER TABLE public.essays ADD COLUMN max_points integer;
