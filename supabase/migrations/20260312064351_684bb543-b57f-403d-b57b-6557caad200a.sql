
CREATE OR REPLACE FUNCTION public.get_content_progress(
  p_chapter_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH content_ids AS (
    SELECT 'mcq' AS qtype, id FROM mcqs
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
    UNION ALL
    SELECT 'essay', id FROM essays
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
    UNION ALL
    SELECT 'osce', id FROM osce_questions
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
    UNION ALL
    SELECT 'case', id FROM virtual_patient_cases
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
    UNION ALL
    SELECT 'matching', id FROM matching_questions
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
  ),
  totals AS (
    SELECT qtype, count(*) AS cnt FROM content_ids GROUP BY qtype
  ),
  completed AS (
    SELECT ci.qtype, count(DISTINCT qa.question_id) AS cnt
    FROM content_ids ci
    JOIN question_attempts qa ON qa.question_id = ci.id
      AND qa.user_id = p_user_id
    GROUP BY ci.qtype
  ),
  lecs AS (
    SELECT video_url FROM lectures
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
  )
  SELECT jsonb_build_object(
    'mcq_total',          COALESCE((SELECT cnt FROM totals WHERE qtype = 'mcq'), 0),
    'essay_total',        COALESCE((SELECT cnt FROM totals WHERE qtype = 'essay'), 0),
    'osce_total',         COALESCE((SELECT cnt FROM totals WHERE qtype = 'osce'), 0),
    'case_total',         COALESCE((SELECT cnt FROM totals WHERE qtype = 'case'), 0),
    'matching_total',     COALESCE((SELECT cnt FROM totals WHERE qtype = 'matching'), 0),
    'mcq_completed',      COALESCE((SELECT cnt FROM completed WHERE qtype = 'mcq'), 0),
    'essay_completed',    COALESCE((SELECT cnt FROM completed WHERE qtype = 'essay'), 0),
    'osce_completed',     COALESCE((SELECT cnt FROM completed WHERE qtype = 'osce'), 0),
    'case_completed',     COALESCE((SELECT cnt FROM completed WHERE qtype = 'case'), 0),
    'matching_completed', COALESCE((SELECT cnt FROM completed WHERE qtype = 'matching'), 0),
    'lectures',           COALESCE((SELECT jsonb_agg(jsonb_build_object('video_url', video_url)) FROM lecs), '[]'::jsonb),
    'video_progress',     COALESCE((SELECT jsonb_agg(jsonb_build_object('video_id', video_id, 'percent_watched', percent_watched))
                            FROM video_progress WHERE user_id = p_user_id), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
