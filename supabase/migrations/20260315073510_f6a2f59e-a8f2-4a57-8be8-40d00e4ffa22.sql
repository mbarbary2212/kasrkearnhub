
-- Create enum for card ratings
CREATE TYPE public.card_rating_type AS ENUM ('easy', 'hard', 'revise');

-- Create card_ratings table
CREATE TABLE public.card_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id UUID NOT NULL,
  rating card_rating_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.card_ratings ENABLE ROW LEVEL SECURITY;

-- Students can read their own ratings
CREATE POLICY "Users can read own card ratings"
  ON public.card_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Students can insert their own ratings
CREATE POLICY "Users can insert own card ratings"
  ON public.card_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Students can update their own ratings
CREATE POLICY "Users can update own card ratings"
  ON public.card_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Students can delete their own ratings
CREATE POLICY "Users can delete own card ratings"
  ON public.card_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_card_ratings_user_card ON public.card_ratings(user_id, card_id);
