-- 1. Add tracking columns for AI/heuristic backfill (mirrors concept_* pattern)
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS topic_auto_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic_ai_confidence numeric NULL;

-- 2. Ensure FK exists from lectures.topic_id -> topics.id (skip if already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lectures_topic_id_fkey'
      AND conrelid = 'public.lectures'::regclass
  ) THEN
    ALTER TABLE public.lectures
      ADD CONSTRAINT lectures_topic_id_fkey
      FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 3. Index for fast topic-grouped lookups (only active rows)
CREATE INDEX IF NOT EXISTS idx_lectures_topic_id
  ON public.lectures(topic_id)
  WHERE is_deleted = false AND topic_id IS NOT NULL;