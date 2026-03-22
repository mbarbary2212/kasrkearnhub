ALTER TABLE public.flashcard_states
  ADD COLUMN IF NOT EXISTS learning_steps integer NOT NULL DEFAULT 0;