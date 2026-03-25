
-- 1) Create the table
CREATE TABLE public.student_chapter_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  module_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  coverage_percent numeric NOT NULL DEFAULT 0,
  videos_completed integer NOT NULL DEFAULT 0,
  videos_total integer NOT NULL DEFAULT 0,
  resources_viewed integer NOT NULL DEFAULT 0,
  mcq_attempts integer NOT NULL DEFAULT 0,
  mcq_correct integer NOT NULL DEFAULT 0,
  mcq_wrong integer NOT NULL DEFAULT 0,
  mcq_accuracy numeric NOT NULL DEFAULT 0,
  recent_mcq_accuracy numeric NOT NULL DEFAULT 0,
  flashcards_due integer NOT NULL DEFAULT 0,
  flashcards_overdue integer NOT NULL DEFAULT 0,
  minutes_reading integer NOT NULL DEFAULT 0,
  minutes_watching integer NOT NULL DEFAULT 0,
  minutes_practicing integer NOT NULL DEFAULT 0,
  minutes_total integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  last_video_at timestamptz,
  last_mcq_attempt_at timestamptz,
  last_flashcard_review_at timestamptz,
  readiness_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, chapter_id)
);

-- 2) Indexes
CREATE INDEX idx_student_chapter_metrics_student ON public.student_chapter_metrics(student_id);
CREATE INDEX idx_student_chapter_metrics_student_module ON public.student_chapter_metrics(student_id, module_id);
CREATE INDEX idx_student_chapter_metrics_student_chapter ON public.student_chapter_metrics(student_id, chapter_id);

-- 3) Updated_at trigger (reuse existing handle_updated_at)
CREATE TRIGGER set_student_chapter_metrics_updated_at
  BEFORE UPDATE ON public.student_chapter_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4) RLS
ALTER TABLE public.student_chapter_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own chapter metrics"
  ON public.student_chapter_metrics
  FOR SELECT
  USING (auth.uid() = student_id);

-- 5) Upsert helper function
CREATE OR REPLACE FUNCTION public.upsert_student_chapter_metrics(
  p_student_id uuid,
  p_module_id uuid,
  p_chapter_id uuid,
  p_coverage_percent numeric DEFAULT NULL,
  p_videos_completed integer DEFAULT NULL,
  p_videos_total integer DEFAULT NULL,
  p_resources_viewed integer DEFAULT NULL,
  p_mcq_attempts integer DEFAULT NULL,
  p_mcq_correct integer DEFAULT NULL,
  p_mcq_wrong integer DEFAULT NULL,
  p_mcq_accuracy numeric DEFAULT NULL,
  p_recent_mcq_accuracy numeric DEFAULT NULL,
  p_flashcards_due integer DEFAULT NULL,
  p_flashcards_overdue integer DEFAULT NULL,
  p_minutes_reading integer DEFAULT NULL,
  p_minutes_watching integer DEFAULT NULL,
  p_minutes_practicing integer DEFAULT NULL,
  p_minutes_total integer DEFAULT NULL,
  p_last_activity_at timestamptz DEFAULT NULL,
  p_last_video_at timestamptz DEFAULT NULL,
  p_last_mcq_attempt_at timestamptz DEFAULT NULL,
  p_last_flashcard_review_at timestamptz DEFAULT NULL,
  p_readiness_score numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_revision_score numeric;
  v_final_coverage numeric;
  v_final_recent_acc numeric;
  v_final_readiness numeric;
  v_flashcards_due_val integer;
  v_flashcards_overdue_val integer;
BEGIN
  INSERT INTO public.student_chapter_metrics (
    student_id, module_id, chapter_id,
    coverage_percent, videos_completed, videos_total, resources_viewed,
    mcq_attempts, mcq_correct, mcq_wrong, mcq_accuracy, recent_mcq_accuracy,
    flashcards_due, flashcards_overdue,
    minutes_reading, minutes_watching, minutes_practicing, minutes_total,
    last_activity_at, last_video_at, last_mcq_attempt_at, last_flashcard_review_at,
    readiness_score
  ) VALUES (
    p_student_id, p_module_id, p_chapter_id,
    COALESCE(p_coverage_percent, 0),
    COALESCE(p_videos_completed, 0),
    COALESCE(p_videos_total, 0),
    COALESCE(p_resources_viewed, 0),
    COALESCE(p_mcq_attempts, 0),
    COALESCE(p_mcq_correct, 0),
    COALESCE(p_mcq_wrong, 0),
    COALESCE(p_mcq_accuracy, 0),
    COALESCE(p_recent_mcq_accuracy, 0),
    COALESCE(p_flashcards_due, 0),
    COALESCE(p_flashcards_overdue, 0),
    COALESCE(p_minutes_reading, 0),
    COALESCE(p_minutes_watching, 0),
    COALESCE(p_minutes_practicing, 0),
    COALESCE(p_minutes_total, 0),
    p_last_activity_at, p_last_video_at, p_last_mcq_attempt_at, p_last_flashcard_review_at,
    COALESCE(p_readiness_score, 0)
  )
  ON CONFLICT (student_id, chapter_id)
  DO UPDATE SET
    module_id = EXCLUDED.module_id,
    coverage_percent = COALESCE(NULLIF(EXCLUDED.coverage_percent, 0), student_chapter_metrics.coverage_percent),
    videos_completed = COALESCE(NULLIF(EXCLUDED.videos_completed, 0), student_chapter_metrics.videos_completed),
    videos_total = COALESCE(NULLIF(EXCLUDED.videos_total, 0), student_chapter_metrics.videos_total),
    resources_viewed = COALESCE(NULLIF(EXCLUDED.resources_viewed, 0), student_chapter_metrics.resources_viewed),
    mcq_attempts = COALESCE(NULLIF(EXCLUDED.mcq_attempts, 0), student_chapter_metrics.mcq_attempts),
    mcq_correct = COALESCE(NULLIF(EXCLUDED.mcq_correct, 0), student_chapter_metrics.mcq_correct),
    mcq_wrong = COALESCE(NULLIF(EXCLUDED.mcq_wrong, 0), student_chapter_metrics.mcq_wrong),
    mcq_accuracy = COALESCE(NULLIF(EXCLUDED.mcq_accuracy, 0), student_chapter_metrics.mcq_accuracy),
    recent_mcq_accuracy = COALESCE(NULLIF(EXCLUDED.recent_mcq_accuracy, 0), student_chapter_metrics.recent_mcq_accuracy),
    flashcards_due = COALESCE(NULLIF(EXCLUDED.flashcards_due, 0), student_chapter_metrics.flashcards_due),
    flashcards_overdue = COALESCE(NULLIF(EXCLUDED.flashcards_overdue, 0), student_chapter_metrics.flashcards_overdue),
    minutes_reading = COALESCE(NULLIF(EXCLUDED.minutes_reading, 0), student_chapter_metrics.minutes_reading),
    minutes_watching = COALESCE(NULLIF(EXCLUDED.minutes_watching, 0), student_chapter_metrics.minutes_watching),
    minutes_practicing = COALESCE(NULLIF(EXCLUDED.minutes_practicing, 0), student_chapter_metrics.minutes_practicing),
    minutes_total = COALESCE(NULLIF(EXCLUDED.minutes_total, 0), student_chapter_metrics.minutes_total),
    last_activity_at = COALESCE(EXCLUDED.last_activity_at, student_chapter_metrics.last_activity_at),
    last_video_at = COALESCE(EXCLUDED.last_video_at, student_chapter_metrics.last_video_at),
    last_mcq_attempt_at = COALESCE(EXCLUDED.last_mcq_attempt_at, student_chapter_metrics.last_mcq_attempt_at),
    last_flashcard_review_at = COALESCE(EXCLUDED.last_flashcard_review_at, student_chapter_metrics.last_flashcard_review_at);

  -- Now recalculate readiness_score for this row
  SELECT coverage_percent, recent_mcq_accuracy, flashcards_due, flashcards_overdue
  INTO v_final_coverage, v_final_recent_acc, v_flashcards_due_val, v_flashcards_overdue_val
  FROM public.student_chapter_metrics
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;

  -- Revision score: 100 if no due cards, 60 if due today, 20 if overdue
  IF v_flashcards_overdue_val > 0 THEN
    v_revision_score := 20;
  ELSIF v_flashcards_due_val > 0 THEN
    v_revision_score := 60;
  ELSE
    v_revision_score := 100;
  END IF;

  v_final_readiness := LEAST(100, GREATEST(0,
    0.4 * v_final_coverage + 0.4 * v_final_recent_acc + 0.2 * v_revision_score
  ));

  UPDATE public.student_chapter_metrics
  SET readiness_score = ROUND(v_final_readiness, 1)
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;
END;
$$;
