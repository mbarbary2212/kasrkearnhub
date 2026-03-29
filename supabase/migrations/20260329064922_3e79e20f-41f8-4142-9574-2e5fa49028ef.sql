
CREATE OR REPLACE FUNCTION public.get_content_progress(p_chapter_id uuid DEFAULT NULL::uuid, p_topic_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT 'matching', id FROM matching_questions
      WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
          OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
        AND NOT is_deleted
    UNION ALL
    SELECT 'true_false', id FROM true_false_questions
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
  case_total_cte AS (
    SELECT count(*) AS cnt
    FROM virtual_patient_cases
    WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
      AND NOT is_deleted
  ),
  case_completed_cte AS (
    SELECT count(DISTINCT vpa.case_id) AS cnt
    FROM virtual_patient_attempts vpa
    JOIN virtual_patient_cases vpc ON vpc.id = vpa.case_id
    WHERE vpa.user_id = p_user_id
      AND vpa.is_completed = true
      AND (
        (p_chapter_id IS NOT NULL AND vpc.chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND vpc.topic_id = p_topic_id)
      )
  ),
  pathway_total_cte AS (
    SELECT count(*) AS cnt
    FROM interactive_algorithms
    WHERE (
      (p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
      OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id)
    ) AND NOT is_deleted
  ),
  pathway_viewed_cte AS (
    SELECT count(DISTINCT content_id) AS cnt
    FROM content_views
    WHERE user_id = p_user_id
      AND content_type = 'pathway'
      AND (
        (p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id)
      )
  ),
  flashcard_total_cte AS (
    SELECT count(*) AS cnt
    FROM flashcards
    WHERE ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
      AND NOT is_deleted
  ),
  flashcard_reviewed_cte AS (
    SELECT count(DISTINCT fs.card_id) AS cnt
    FROM flashcard_states fs
    JOIN flashcards f ON f.id = fs.card_id
    WHERE fs.user_id = p_user_id
      AND fs.reps > 0
      AND ((p_chapter_id IS NOT NULL AND f.chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND f.topic_id = p_topic_id))
      AND NOT f.is_deleted
  ),
  mind_map_total_cte AS (
    SELECT count(*) AS cnt
    FROM study_resources
    WHERE resource_type = 'mind_map'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  mind_map_viewed_cte AS (
    SELECT count(DISTINCT content_id) AS cnt
    FROM content_views
    WHERE user_id = p_user_id
      AND content_type = 'mind_map'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  guided_total_cte AS (
    SELECT count(*) AS cnt
    FROM study_resources
    WHERE resource_type = 'guided_explanation'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  guided_viewed_cte AS (
    SELECT count(DISTINCT content_id) AS cnt
    FROM content_views
    WHERE user_id = p_user_id
      AND content_type = 'guided_explanation'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  reference_total_cte AS (
    SELECT count(*) AS cnt
    FROM study_resources
    WHERE resource_type IN ('table', 'exam_tip', 'key_image')
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  reference_viewed_cte AS (
    SELECT count(DISTINCT content_id) AS cnt
    FROM content_views
    WHERE user_id = p_user_id
      AND content_type = 'reference_material'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  clinical_tool_total_cte AS (
    SELECT count(*) AS cnt
    FROM study_resources
    WHERE resource_type = 'clinical_case_worked'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
  ),
  clinical_tool_viewed_cte AS (
    SELECT count(DISTINCT content_id) AS cnt
    FROM content_views
    WHERE user_id = p_user_id
      AND content_type = 'clinical_tool'
      AND ((p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
        OR (p_topic_id IS NOT NULL AND topic_id = p_topic_id))
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
    'matching_total',     COALESCE((SELECT cnt FROM totals WHERE qtype = 'matching'), 0),
    'tf_total',           COALESCE((SELECT cnt FROM totals WHERE qtype = 'true_false'), 0),
    'mcq_completed',      COALESCE((SELECT cnt FROM completed WHERE qtype = 'mcq'), 0),
    'essay_completed',    COALESCE((SELECT cnt FROM completed WHERE qtype = 'essay'), 0),
    'osce_completed',     COALESCE((SELECT cnt FROM completed WHERE qtype = 'osce'), 0),
    'matching_completed', COALESCE((SELECT cnt FROM completed WHERE qtype = 'matching'), 0),
    'tf_completed',       COALESCE((SELECT cnt FROM completed WHERE qtype = 'true_false'), 0),
    'case_total',         COALESCE((SELECT cnt FROM case_total_cte), 0),
    'case_completed',     COALESCE((SELECT cnt FROM case_completed_cte), 0),
    'pathway_total',      COALESCE((SELECT cnt FROM pathway_total_cte), 0),
    'pathway_viewed',     COALESCE((SELECT cnt FROM pathway_viewed_cte), 0),
    'flashcard_total',    COALESCE((SELECT cnt FROM flashcard_total_cte), 0),
    'flashcard_reviewed', COALESCE((SELECT cnt FROM flashcard_reviewed_cte), 0),
    'mind_map_total',     COALESCE((SELECT cnt FROM mind_map_total_cte), 0),
    'mind_map_viewed',    COALESCE((SELECT cnt FROM mind_map_viewed_cte), 0),
    'guided_total',       COALESCE((SELECT cnt FROM guided_total_cte), 0),
    'guided_viewed',      COALESCE((SELECT cnt FROM guided_viewed_cte), 0),
    'reference_total',    COALESCE((SELECT cnt FROM reference_total_cte), 0),
    'reference_viewed',   COALESCE((SELECT cnt FROM reference_viewed_cte), 0),
    'clinical_tool_total',  COALESCE((SELECT cnt FROM clinical_tool_total_cte), 0),
    'clinical_tool_viewed', COALESCE((SELECT cnt FROM clinical_tool_viewed_cte), 0),
    'lectures',           COALESCE((SELECT jsonb_agg(jsonb_build_object('video_url', video_url)) FROM lecs), '[]'::jsonb),
    'video_progress',     COALESCE((
      SELECT jsonb_agg(jsonb_build_object('video_id', video_id, 'percent_watched', percent_watched))
      FROM video_progress WHERE user_id = p_user_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;
