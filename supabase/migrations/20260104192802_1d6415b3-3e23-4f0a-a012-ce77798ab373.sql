-- =============================================
-- Question Attempts & Chapter Attempts System
-- For MCQ and OSCE per-question tracking with 
-- multiple attempts and peer comparison support
-- =============================================

-- Create enum for question attempt status
CREATE TYPE public.question_attempt_status AS ENUM ('unseen', 'attempted', 'correct', 'incorrect');

-- Create enum for question type
CREATE TYPE public.practice_question_type AS ENUM ('mcq', 'osce');

-- =============================================
-- 1. Question Attempts - Per-question tracking
-- =============================================
CREATE TABLE public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_type public.practice_question_type NOT NULL,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status public.question_attempt_status NOT NULL DEFAULT 'attempted',
  selected_answer JSONB, -- Flexible: for MCQ stores key, for OSCE stores {1: true, 2: false, ...}
  is_correct BOOLEAN,
  score INTEGER, -- For OSCE: 0-5 statements correct
  time_spent_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by user + question + attempt
CREATE INDEX idx_question_attempts_user_question ON public.question_attempts(user_id, question_id, question_type, attempt_number);
CREATE INDEX idx_question_attempts_chapter ON public.question_attempts(user_id, chapter_id, question_type, attempt_number);
CREATE INDEX idx_question_attempts_created ON public.question_attempts(created_at DESC);

-- =============================================
-- 2. Chapter Attempts - Per-chapter aggregation
-- =============================================
CREATE TABLE public.chapter_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question_type public.practice_question_type NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one attempt per user per chapter per type per attempt number
  UNIQUE(user_id, chapter_id, question_type, attempt_number)
);

-- Indexes for chapter attempts
CREATE INDEX idx_chapter_attempts_user_chapter ON public.chapter_attempts(user_id, chapter_id, question_type);
CREATE INDEX idx_chapter_attempts_stats ON public.chapter_attempts(chapter_id, question_type, is_completed);

-- =============================================
-- 3. Enable RLS
-- =============================================

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_attempts
CREATE POLICY "Users can view their own question attempts"
  ON public.question_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question attempts"
  ON public.question_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question attempts"
  ON public.question_attempts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for chapter_attempts
CREATE POLICY "Users can view their own chapter attempts"
  ON public.chapter_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chapter attempts"
  ON public.chapter_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapter attempts"
  ON public.chapter_attempts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- 4. Function to get anonymous percentile ranking
-- =============================================
CREATE OR REPLACE FUNCTION public.get_chapter_percentile(
  p_chapter_id UUID,
  p_question_type public.practice_question_type,
  p_user_score INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentile INTEGER;
  v_total_users INTEGER;
  v_users_below INTEGER;
BEGIN
  -- Count total unique users who completed this chapter type
  SELECT COUNT(DISTINCT user_id)
  INTO v_total_users
  FROM chapter_attempts
  WHERE chapter_id = p_chapter_id
    AND question_type = p_question_type
    AND is_completed = true;

  IF v_total_users < 2 THEN
    -- Not enough data for meaningful comparison
    RETURN NULL;
  END IF;

  -- Count users with lower latest scores
  SELECT COUNT(*)
  INTO v_users_below
  FROM (
    SELECT DISTINCT ON (user_id) user_id, score
    FROM chapter_attempts
    WHERE chapter_id = p_chapter_id
      AND question_type = p_question_type
      AND is_completed = true
    ORDER BY user_id, attempt_number DESC
  ) latest_attempts
  WHERE score < p_user_score;

  -- Calculate percentile
  v_percentile := ROUND((v_users_below::NUMERIC / v_total_users::NUMERIC) * 100);
  
  RETURN v_percentile;
END;
$$;

-- =============================================
-- 5. Trigger for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_question_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_question_attempts_timestamp
  BEFORE UPDATE ON public.question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_question_attempts_updated_at();

CREATE TRIGGER update_chapter_attempts_timestamp
  BEFORE UPDATE ON public.chapter_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_question_attempts_updated_at();