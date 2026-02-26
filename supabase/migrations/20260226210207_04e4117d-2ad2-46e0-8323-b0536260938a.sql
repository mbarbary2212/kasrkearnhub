
-- Add flag_reason column for manual flagging with a reason
ALTER TABLE public.virtual_patient_attempts
  ADD COLUMN IF NOT EXISTS flag_reason text;

-- Create summary view for AI case analytics dashboard
CREATE OR REPLACE VIEW public.ai_case_attempt_summary AS
  SELECT
    a.id AS attempt_id,
    a.user_id,
    a.case_id,
    a.score,
    a.is_completed,
    a.flag_for_review,
    a.flag_reason,
    a.tokens_used,
    a.started_at,
    a.completed_at,
    a.total_stages,
    COALESCE(
      a.time_taken_seconds,
      EXTRACT(EPOCH FROM (a.completed_at - a.started_at))::integer
    ) AS duration_seconds,
    c.title AS case_title,
    c.level AS case_difficulty,
    c.module_id,
    c.topic_id,
    c.max_turns,
    p.full_name AS student_name,
    p.email AS student_email,
    ROUND((COALESCE(a.tokens_used, 0)::numeric / 1000000) * 9, 4) AS estimated_cost_usd,
    (SELECT COUNT(*) FROM public.ai_case_messages m WHERE m.attempt_id = a.id) AS message_count,
    (
      SELECT m.structured_data->>'summary'
      FROM public.ai_case_messages m
      WHERE m.attempt_id = a.id AND m.role = 'assistant'
        AND m.structured_data->>'type' = 'debrief'
      ORDER BY m.turn_number DESC LIMIT 1
    ) AS debrief_summary
  FROM public.virtual_patient_attempts a
  JOIN public.virtual_patient_cases c ON c.id = a.case_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE c.is_ai_driven = true;
