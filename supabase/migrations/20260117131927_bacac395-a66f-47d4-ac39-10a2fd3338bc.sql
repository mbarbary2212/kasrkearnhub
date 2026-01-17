-- =============================================
-- Part 2: Data Migration - Migrate case_scenarios to virtual_patient_cases
-- =============================================

-- Migrate case_scenarios into virtual_patient_cases as read_case entries
INSERT INTO virtual_patient_cases (
  title,
  intro_text,
  module_id,
  chapter_id,
  topic_id,
  case_mode,
  level,
  estimated_minutes,
  tags,
  is_published,
  is_deleted,
  created_by,
  created_at,
  legacy_case_scenario_id
)
SELECT 
  cs.title,
  cs.case_history as intro_text,
  cs.module_id,
  cs.chapter_id,
  NULL as topic_id,
  'read_case' as case_mode,
  'beginner' as level,
  5 as estimated_minutes,
  ARRAY[]::text[] as tags,
  true as is_published,
  cs.is_deleted,
  cs.created_by,
  COALESCE(cs.created_at, now()),
  cs.id as legacy_case_scenario_id
FROM case_scenarios cs
WHERE NOT EXISTS (
  SELECT 1 FROM virtual_patient_cases vpc 
  WHERE vpc.legacy_case_scenario_id = cs.id
);

-- Create single read_only stage for each migrated case
INSERT INTO virtual_patient_stages (
  case_id,
  stage_order,
  stage_type,
  prompt,
  patient_info,
  choices,
  correct_answer,
  explanation,
  teaching_points,
  rubric
)
SELECT 
  vpc.id as case_id,
  1 as stage_order,
  'read_only' as stage_type,
  cs.case_questions as prompt,
  NULL as patient_info,
  '[]'::jsonb as choices,
  to_jsonb(cs.model_answer) as correct_answer,
  NULL as explanation,
  ARRAY[]::text[] as teaching_points,
  NULL as rubric
FROM case_scenarios cs
JOIN virtual_patient_cases vpc ON vpc.legacy_case_scenario_id = cs.id
WHERE NOT EXISTS (
  SELECT 1 FROM virtual_patient_stages vps 
  WHERE vps.case_id = vpc.id
);