-- 1. Fix admin_notifications INSERT policy: restrict to authenticated only
-- The trigger_send_admin_email function and other SECURITY DEFINER functions 
-- handle the actual inserts, so we can remove direct INSERT access entirely
-- and only allow inserts from service role / SECURITY DEFINER functions.
-- However, since the trigger function uses SECURITY DEFINER which bypasses RLS,
-- we can safely restrict the policy to prevent direct client inserts.
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;
-- No direct INSERT policy needed - all inserts go through SECURITY DEFINER functions
-- (notify_super_admins_pending_announcement, notify_announcement_decision, 
--  notify_user_role_change, notify_user_module_assignment, notify_user_topic_assignment,
--  notify_admins_new_access_request) which bypass RLS.

-- 2. Fix audit_log INSERT policy: remove direct INSERT access
-- All audit inserts go through log_audit_event() SECURITY DEFINER function
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- 3. Fix get_user_feedback_count_today to restrict to auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_feedback_count_today(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.feedback
  WHERE created_by = _user_id
    AND _user_id = auth.uid()
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$function$;

-- 4. Fix save_question_attempt - add SET search_path
CREATE OR REPLACE FUNCTION public.save_question_attempt(p_question_id uuid, p_question_type practice_question_type, p_chapter_id uuid DEFAULT NULL::uuid, p_topic_id uuid DEFAULT NULL::uuid, p_module_id uuid DEFAULT NULL::uuid, p_selected_answer jsonb DEFAULT NULL::jsonb, p_is_correct boolean DEFAULT false, p_score integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    SET    selected_answer = p_selected_answer,
           status          = v_status,
           is_correct      = p_is_correct,
           score           = p_score,
           updated_at      = now()
    WHERE  id = v_existing_qa_id;
  ELSE
    INSERT INTO question_attempts (
      user_id, question_id, question_type,
      chapter_id, topic_id, module_id,
      attempt_number, selected_answer,
      status, is_correct, score
    ) VALUES (
      v_user_id, p_question_id, p_question_type,
      p_chapter_id, p_topic_id, p_module_id,
      v_attempt_number, p_selected_answer,
      v_status, p_is_correct, p_score
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
$function$;