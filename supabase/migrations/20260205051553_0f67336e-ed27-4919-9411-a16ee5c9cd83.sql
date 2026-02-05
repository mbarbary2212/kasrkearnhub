-- Drop the old constraint that requires exactly 5 choices
ALTER TABLE public.mcqs DROP CONSTRAINT IF EXISTS mcqs_choices_count_check;

-- Add new constraint that allows 4 or 5 choices
ALTER TABLE public.mcqs ADD CONSTRAINT mcqs_choices_count_check 
CHECK (jsonb_array_length(choices) >= 4 AND jsonb_array_length(choices) <= 5);