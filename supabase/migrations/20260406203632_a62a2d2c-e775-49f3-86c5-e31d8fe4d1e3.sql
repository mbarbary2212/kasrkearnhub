
-- Step 1: Add new columns to student_readiness_cache
ALTER TABLE public.student_readiness_cache
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS readiness_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chapter_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS component_scores jsonb NOT NULL DEFAULT '{"engagement":0,"performance":0,"retention":0,"consistency":0,"confidence":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_level text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_urgency text NOT NULL DEFAULT 'low_priority',
  ADD COLUMN IF NOT EXISTS review_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_best_action text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS insight_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS calculation_version text NOT NULL DEFAULT '2.0.0',
  ADD COLUMN IF NOT EXISTS is_stale boolean NOT NULL DEFAULT true;

-- Step 2: Drop old unique constraint and create new one including chapter_id
-- First check and drop existing constraint
DO $$
BEGIN
  -- Drop existing unique constraint on (user_id, module_id) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_readiness_cache_user_id_module_id_key'
  ) THEN
    ALTER TABLE public.student_readiness_cache 
      DROP CONSTRAINT student_readiness_cache_user_id_module_id_key;
  END IF;
END $$;

-- Add new unique constraint
ALTER TABLE public.student_readiness_cache
  ADD CONSTRAINT student_readiness_cache_user_chapter_unique 
  UNIQUE (user_id, chapter_id);

-- Step 3: Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_readiness_cache_user_module 
  ON public.student_readiness_cache(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_readiness_cache_stale 
  ON public.student_readiness_cache(is_stale) WHERE is_stale = true;

-- Step 4: Trigger to mark cache stale on question_attempts changes
CREATE OR REPLACE FUNCTION public.mark_readiness_cache_stale_on_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_readiness_cache
  SET is_stale = true
  WHERE user_id = NEW.user_id
    AND chapter_id = NEW.chapter_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_cache_stale_on_attempt ON public.question_attempts;
CREATE TRIGGER trg_mark_cache_stale_on_attempt
  AFTER INSERT OR UPDATE ON public.question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_readiness_cache_stale_on_attempt();

-- Step 5: Trigger to mark cache stale on flashcard_states changes
CREATE OR REPLACE FUNCTION public.mark_readiness_cache_stale_on_flashcard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  -- Look up chapter_id from the flashcard
  SELECT chapter_id INTO v_chapter_id
  FROM public.flashcards
  WHERE id = NEW.card_id;

  IF v_chapter_id IS NOT NULL THEN
    UPDATE public.student_readiness_cache
    SET is_stale = true
    WHERE user_id = NEW.user_id
      AND chapter_id = v_chapter_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_cache_stale_on_flashcard ON public.flashcard_states;
CREATE TRIGGER trg_mark_cache_stale_on_flashcard
  AFTER INSERT OR UPDATE ON public.flashcard_states
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_readiness_cache_stale_on_flashcard();

-- Step 6: RLS policies
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own readiness cache" ON public.student_readiness_cache;
DROP POLICY IF EXISTS "Admins can view all readiness cache" ON public.student_readiness_cache;
DROP POLICY IF EXISTS "Service role manages readiness cache" ON public.student_readiness_cache;

-- Students can read their own
CREATE POLICY "Users can view their own readiness cache"
  ON public.student_readiness_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins/teachers can read all
CREATE POLICY "Admins can view all readiness cache"
  ON public.student_readiness_cache
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
    OR public.is_platform_admin_or_higher(auth.uid())
  );
