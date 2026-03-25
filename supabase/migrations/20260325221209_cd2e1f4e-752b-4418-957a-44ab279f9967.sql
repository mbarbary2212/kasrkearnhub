
-- Add confidence_level to question_attempts
ALTER TABLE public.question_attempts
ADD COLUMN IF NOT EXISTS confidence_level smallint DEFAULT NULL;

-- Add confidence-derived columns to student_chapter_metrics
ALTER TABLE public.student_chapter_metrics
ADD COLUMN IF NOT EXISTS confidence_avg numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence_mismatch_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overconfident_error_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS underconfident_correct_rate numeric NOT NULL DEFAULT 0;

-- Update save_question_attempt to accept confidence_level
CREATE OR REPLACE FUNCTION public.save_question_attempt(
  p_question_id uuid,
  p_question_type practice_question_type,
  p_chapter_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_module_id uuid DEFAULT NULL,
  p_selected_answer jsonb DEFAULT NULL,
  p_is_correct boolean DEFAULT false,
  p_score integer DEFAULT NULL,
  p_confidence_level smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id          uuid    := auth.uid();
  v_attempt_number   integer := 1;
  v_is_completed     boolean;
  v_existing_qa_id   uuid;
  v_status           question_attempt_status;
  v_ca_id            uuid;
  v_total_questions  integer := 0;
  v_correct_count    integer := 0;
  v_total_score      integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_chapter_id IS NOT NULL THEN
    SELECT attempt_number, is_completed
    INTO   v_attempt_number, v_is_completed
    FROM   chapter_attempts
    WHERE  user_id       = v_user_id
      AND  chapter_id    = p_chapter_id
      AND  question_type = p_question_type
    ORDER  BY attempt_number DESC
    LIMIT  1;

    IF NOT FOUND THEN
      v_attempt_number := 1;
    ELSIF v_is_completed THEN
      v_attempt_number := v_attempt_number + 1;
    END IF;
  ELSE
    v_attempt_number := 1;
  END IF;

  v_status := CASE WHEN p_is_correct
                   THEN 'correct'::question_attempt_status
                   ELSE 'incorrect'::question_attempt_status
              END;

  SELECT id INTO v_existing_qa_id
  FROM   question_attempts
  WHERE  user_id        = v_user_id
    AND  question_id    = p_question_id
    AND  question_type  = p_question_type
    AND  attempt_number = v_attempt_number;

  IF FOUND THEN
    UPDATE question_attempts
    SET    selected_answer  = p_selected_answer,
           status           = v_status,
           is_correct       = p_is_correct,
           score            = p_score,
           confidence_level = COALESCE(p_confidence_level, confidence_level),
           updated_at       = now()
    WHERE  id = v_existing_qa_id;
  ELSE
    INSERT INTO question_attempts (
      user_id, question_id, question_type,
      chapter_id, topic_id, module_id,
      attempt_number, selected_answer,
      status, is_correct, score, confidence_level
    ) VALUES (
      v_user_id, p_question_id, p_question_type,
      p_chapter_id, p_topic_id, p_module_id,
      v_attempt_number, p_selected_answer,
      v_status, p_is_correct, p_score, p_confidence_level
    );
  END IF;

  IF p_chapter_id IS NOT NULL THEN
    IF p_question_type = 'mcq' THEN
      SELECT COUNT(*) INTO v_total_questions
      FROM   mcqs
      WHERE  chapter_id = p_chapter_id AND is_deleted = false;
    ELSE
      SELECT COUNT(*) INTO v_total_questions
      FROM   osce_questions
      WHERE  chapter_id = p_chapter_id AND is_deleted = false;
    END IF;

    SELECT
      COUNT(*) FILTER (WHERE is_correct = true),
      COALESCE(SUM(score), 0)
    INTO v_correct_count, v_total_score
    FROM question_attempts
    WHERE user_id        = v_user_id
      AND chapter_id     = p_chapter_id
      AND question_type  = p_question_type
      AND attempt_number = v_attempt_number;

    IF p_question_type = 'mcq' THEN
      v_total_score := v_correct_count;
    END IF;

    SELECT id INTO v_ca_id
    FROM   chapter_attempts
    WHERE  user_id        = v_user_id
      AND  chapter_id     = p_chapter_id
      AND  question_type  = p_question_type
      AND  attempt_number = v_attempt_number;

    IF FOUND THEN
      UPDATE chapter_attempts
      SET    total_questions = v_total_questions,
             correct_count   = v_correct_count,
             score           = v_total_score,
             updated_at      = now()
      WHERE  id = v_ca_id;
    ELSE
      INSERT INTO chapter_attempts (
        user_id, chapter_id, module_id, question_type,
        attempt_number, total_questions, correct_count,
        score, started_at
      ) VALUES (
        v_user_id, p_chapter_id, p_module_id, p_question_type,
        v_attempt_number, v_total_questions, v_correct_count,
        v_total_score, now()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'attempt_number', v_attempt_number
  );
END;
$$;
