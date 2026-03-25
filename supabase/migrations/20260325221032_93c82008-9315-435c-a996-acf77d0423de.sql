
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
  v_consistency_score numeric;
  v_final_coverage numeric;
  v_final_recent_acc numeric;
  v_final_readiness numeric;
  v_flashcards_due_val integer;
  v_flashcards_overdue_val integer;
  v_last_activity timestamptz;
  v_days_since numeric;
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

  -- Recalculate readiness with improved formula:
  -- 0.30 * coverage + 0.40 * recent_accuracy + 0.20 * revision + 0.10 * consistency
  SELECT coverage_percent, recent_mcq_accuracy, flashcards_due, flashcards_overdue, last_activity_at
  INTO v_final_coverage, v_final_recent_acc, v_flashcards_due_val, v_flashcards_overdue_val, v_last_activity
  FROM public.student_chapter_metrics
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;

  -- Revision score
  IF v_flashcards_overdue_val > 0 THEN
    v_revision_score := 20;
  ELSIF v_flashcards_due_val > 0 THEN
    v_revision_score := 60;
  ELSE
    v_revision_score := 100;
  END IF;

  -- Consistency score based on recency of activity
  IF v_last_activity IS NULL THEN
    v_consistency_score := 0;
  ELSE
    v_days_since := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 86400.0;
    IF v_days_since < 3 THEN
      v_consistency_score := 100;
    ELSIF v_days_since < 7 THEN
      v_consistency_score := 70;
    ELSE
      v_consistency_score := 30;
    END IF;
  END IF;

  v_final_readiness := LEAST(100, GREATEST(0,
    0.30 * v_final_coverage + 0.40 * v_final_recent_acc + 0.20 * v_revision_score + 0.10 * v_consistency_score
  ));

  UPDATE public.student_chapter_metrics
  SET readiness_score = ROUND(v_final_readiness, 1)
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;
END;
$$;
