-- Fix: student_chapter_metrics fields could ratchet up but never reset to 0.
--
-- upsert_student_chapter_metrics used COALESCE(NULLIF(EXCLUDED.x, 0), existing)
-- for its counter fields. A caller passing 0 (e.g. "all flashcards cleared",
-- "0% accuracy") was treated as "no change" and the stale value was kept.
-- Result: cleared flashcards nagged forever and a genuine 0% could not be
-- recorded. Every param already defaults to NULL and each caller only passes
-- the fields it owns, so switching to plain COALESCE(EXCLUDED.x, existing)
-- keeps partial updates safe (NULL preserves) while letting an explicit 0 set.
--
-- Only the DO UPDATE SET changed vs 20260325221618; body/signature identical.

CREATE OR REPLACE FUNCTION public.upsert_student_chapter_metrics(
  p_student_id uuid, p_module_id uuid, p_chapter_id uuid,
  p_coverage_percent numeric DEFAULT NULL, p_videos_completed integer DEFAULT NULL,
  p_videos_total integer DEFAULT NULL, p_resources_viewed integer DEFAULT NULL,
  p_mcq_attempts integer DEFAULT NULL, p_mcq_correct integer DEFAULT NULL,
  p_mcq_wrong integer DEFAULT NULL, p_mcq_accuracy numeric DEFAULT NULL,
  p_recent_mcq_accuracy numeric DEFAULT NULL, p_flashcards_due integer DEFAULT NULL,
  p_flashcards_overdue integer DEFAULT NULL, p_minutes_reading integer DEFAULT NULL,
  p_minutes_watching integer DEFAULT NULL, p_minutes_practicing integer DEFAULT NULL,
  p_minutes_total integer DEFAULT NULL, p_last_activity_at timestamptz DEFAULT NULL,
  p_last_video_at timestamptz DEFAULT NULL, p_last_mcq_attempt_at timestamptz DEFAULT NULL,
  p_last_flashcard_review_at timestamptz DEFAULT NULL, p_readiness_score numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_revision_score numeric;
  v_consistency_score numeric;
  v_confidence_alignment numeric;
  v_final_coverage numeric;
  v_final_recent_acc numeric;
  v_final_readiness numeric;
  v_review_strength numeric;
  v_review_interval integer;
  v_flashcards_due_val integer;
  v_flashcards_overdue_val integer;
  v_last_activity timestamptz;
  v_days_since numeric;
  v_conf_mismatch numeric;
  v_prev_interval integer;
  v_prev_strength numeric;
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
    COALESCE(p_coverage_percent, 0), COALESCE(p_videos_completed, 0),
    COALESCE(p_videos_total, 0), COALESCE(p_resources_viewed, 0),
    COALESCE(p_mcq_attempts, 0), COALESCE(p_mcq_correct, 0),
    COALESCE(p_mcq_wrong, 0), COALESCE(p_mcq_accuracy, 0),
    COALESCE(p_recent_mcq_accuracy, 0), COALESCE(p_flashcards_due, 0),
    COALESCE(p_flashcards_overdue, 0), COALESCE(p_minutes_reading, 0),
    COALESCE(p_minutes_watching, 0), COALESCE(p_minutes_practicing, 0),
    COALESCE(p_minutes_total, 0),
    p_last_activity_at, p_last_video_at, p_last_mcq_attempt_at, p_last_flashcard_review_at,
    COALESCE(p_readiness_score, 0)
  )
  ON CONFLICT (student_id, chapter_id)
  DO UPDATE SET
    module_id = EXCLUDED.module_id,
    coverage_percent = COALESCE(EXCLUDED.coverage_percent, student_chapter_metrics.coverage_percent),
    videos_completed = COALESCE(EXCLUDED.videos_completed, student_chapter_metrics.videos_completed),
    videos_total = COALESCE(EXCLUDED.videos_total, student_chapter_metrics.videos_total),
    resources_viewed = COALESCE(EXCLUDED.resources_viewed, student_chapter_metrics.resources_viewed),
    mcq_attempts = COALESCE(EXCLUDED.mcq_attempts, student_chapter_metrics.mcq_attempts),
    mcq_correct = COALESCE(EXCLUDED.mcq_correct, student_chapter_metrics.mcq_correct),
    mcq_wrong = COALESCE(EXCLUDED.mcq_wrong, student_chapter_metrics.mcq_wrong),
    mcq_accuracy = COALESCE(EXCLUDED.mcq_accuracy, student_chapter_metrics.mcq_accuracy),
    recent_mcq_accuracy = COALESCE(EXCLUDED.recent_mcq_accuracy, student_chapter_metrics.recent_mcq_accuracy),
    flashcards_due = COALESCE(EXCLUDED.flashcards_due, student_chapter_metrics.flashcards_due),
    flashcards_overdue = COALESCE(EXCLUDED.flashcards_overdue, student_chapter_metrics.flashcards_overdue),
    minutes_reading = COALESCE(EXCLUDED.minutes_reading, student_chapter_metrics.minutes_reading),
    minutes_watching = COALESCE(EXCLUDED.minutes_watching, student_chapter_metrics.minutes_watching),
    minutes_practicing = COALESCE(EXCLUDED.minutes_practicing, student_chapter_metrics.minutes_practicing),
    minutes_total = COALESCE(EXCLUDED.minutes_total, student_chapter_metrics.minutes_total),
    last_activity_at = COALESCE(EXCLUDED.last_activity_at, student_chapter_metrics.last_activity_at),
    last_video_at = COALESCE(EXCLUDED.last_video_at, student_chapter_metrics.last_video_at),
    last_mcq_attempt_at = COALESCE(EXCLUDED.last_mcq_attempt_at, student_chapter_metrics.last_mcq_attempt_at),
    last_flashcard_review_at = COALESCE(EXCLUDED.last_flashcard_review_at, student_chapter_metrics.last_flashcard_review_at);

  -- Read current state for readiness + review scheduling
  SELECT coverage_percent, recent_mcq_accuracy, flashcards_due, flashcards_overdue,
         last_activity_at, confidence_mismatch_rate, last_review_interval, review_strength
  INTO v_final_coverage, v_final_recent_acc, v_flashcards_due_val, v_flashcards_overdue_val,
       v_last_activity, v_conf_mismatch, v_prev_interval, v_prev_strength
  FROM public.student_chapter_metrics
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;

  -- Revision score
  IF v_flashcards_overdue_val > 0 THEN v_revision_score := 20;
  ELSIF v_flashcards_due_val > 0 THEN v_revision_score := 60;
  ELSE v_revision_score := 100;
  END IF;

  -- Consistency score
  IF v_last_activity IS NULL THEN v_consistency_score := 0;
  ELSE
    v_days_since := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 86400.0;
    IF v_days_since < 3 THEN v_consistency_score := 100;
    ELSIF v_days_since < 7 THEN v_consistency_score := 70;
    ELSE v_consistency_score := 30;
    END IF;
  END IF;

  -- Confidence alignment = 100 - mismatch_rate
  v_confidence_alignment := GREATEST(0, LEAST(100, 100 - COALESCE(v_conf_mismatch, 0)));

  -- Readiness: 0.28 coverage + 0.37 accuracy + 0.20 revision + 0.10 consistency + 0.05 confidence
  v_final_readiness := LEAST(100, GREATEST(0,
    0.28 * v_final_coverage + 0.37 * v_final_recent_acc + 0.20 * v_revision_score + 0.10 * v_consistency_score + 0.05 * v_confidence_alignment
  ));

  -- Review strength: 0.6 * recent_accuracy + 0.4 * confidence_alignment
  v_review_strength := LEAST(100, GREATEST(0,
    0.6 * v_final_recent_acc + 0.4 * v_confidence_alignment
  ));

  -- Apply decay if inactive > 7 days
  IF v_last_activity IS NOT NULL THEN
    v_days_since := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 86400.0;
    IF v_days_since > 14 THEN
      v_review_strength := v_review_strength * 0.8;
    ELSIF v_days_since > 7 THEN
      v_review_strength := v_review_strength * 0.9;
    END IF;
  END IF;

  -- Determine review interval from strength
  IF v_review_strength < 50 THEN v_review_interval := 1;
  ELSIF v_review_strength < 70 THEN v_review_interval := 2;
  ELSIF v_review_strength < 85 THEN v_review_interval := 4;
  ELSIF v_review_strength < 95 THEN v_review_interval := 7;
  ELSE v_review_interval := 14;
  END IF;

  -- Adaptive: if MCQ attempt just happened, adjust based on performance
  IF p_mcq_attempts IS NOT NULL AND p_mcq_attempts > 0 THEN
    IF v_final_recent_acc >= 75 THEN
      v_review_interval := LEAST(14, GREATEST(v_review_interval, CEIL(v_prev_interval * 1.5)::integer));
    ELSIF v_final_recent_acc < 60 THEN
      v_review_interval := GREATEST(1, FLOOR(v_prev_interval / 2.0)::integer);
    END IF;
  END IF;

  UPDATE public.student_chapter_metrics
  SET readiness_score = ROUND(v_final_readiness, 1),
      review_strength = ROUND(v_review_strength, 1),
      last_review_interval = v_review_interval,
      next_review_at = now() + (v_review_interval || ' days')::interval
  WHERE student_id = p_student_id AND chapter_id = p_chapter_id;
END;
$$;
