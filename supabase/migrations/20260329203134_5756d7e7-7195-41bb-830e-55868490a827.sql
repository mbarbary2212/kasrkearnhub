
-- Add difficulty column to osce_questions (Recall component)
-- Using TEXT to match the blueprint's easy/moderate/difficult values
ALTER TABLE public.osce_questions
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT NULL;

-- Add indexes for exam generation filtering
CREATE INDEX IF NOT EXISTS idx_osce_questions_difficulty ON public.osce_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_mcqs_difficulty ON public.mcqs(difficulty);
