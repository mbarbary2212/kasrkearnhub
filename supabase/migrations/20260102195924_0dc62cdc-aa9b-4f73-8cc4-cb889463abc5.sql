-- Create table for syncing starred flashcards across devices
CREATE TABLE public.user_flashcard_stars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.study_resources(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.user_flashcard_stars ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own stars
CREATE POLICY "Users can view their own stars"
  ON public.user_flashcard_stars
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stars"
  ON public.user_flashcard_stars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stars"
  ON public.user_flashcard_stars
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_flashcard_stars_user_chapter 
  ON public.user_flashcard_stars(user_id, chapter_id);

CREATE INDEX idx_user_flashcard_stars_user_card 
  ON public.user_flashcard_stars(user_id, card_id);