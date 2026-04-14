
-- Step 1: Create a temp table identifying keepers vs duplicates
CREATE TEMP TABLE section_dedup AS
WITH ranked AS (
  SELECT
    id,
    chapter_id,
    LOWER(TRIM(name)) AS norm_name,
    ROW_NUMBER() OVER (PARTITION BY chapter_id, LOWER(TRIM(name)) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.sections
  WHERE chapter_id IS NOT NULL
)
SELECT
  r.id AS dupe_id,
  k.id AS keeper_id
FROM ranked r
JOIN ranked k ON k.chapter_id = r.chapter_id AND k.norm_name = r.norm_name AND k.rn = 1
WHERE r.rn > 1;

-- Step 2: Reassign all child records from dupes to keepers
UPDATE public.mcqs SET section_id = d.keeper_id FROM section_dedup d WHERE mcqs.section_id = d.dupe_id;
UPDATE public.chapter_blueprint_config SET section_id = d.keeper_id FROM section_dedup d WHERE chapter_blueprint_config.section_id = d.dupe_id;
UPDATE public.mind_maps SET section_id = d.keeper_id FROM section_dedup d WHERE mind_maps.section_id = d.dupe_id;
UPDATE public.study_resources SET section_id = d.keeper_id FROM section_dedup d WHERE study_resources.section_id = d.dupe_id;
UPDATE public.case_scenarios SET section_id = d.keeper_id FROM section_dedup d WHERE case_scenarios.section_id = d.dupe_id;
UPDATE public.concepts SET section_id = d.keeper_id FROM section_dedup d WHERE concepts.section_id = d.dupe_id;
UPDATE public.essays SET section_id = d.keeper_id FROM section_dedup d WHERE essays.section_id = d.dupe_id;
UPDATE public.matching_questions SET section_id = d.keeper_id FROM section_dedup d WHERE matching_questions.section_id = d.dupe_id;
UPDATE public.mcq_sets SET section_id = d.keeper_id FROM section_dedup d WHERE mcq_sets.section_id = d.dupe_id;
UPDATE public.osce_questions SET section_id = d.keeper_id FROM section_dedup d WHERE osce_questions.section_id = d.dupe_id;
UPDATE public.practicals SET section_id = d.keeper_id FROM section_dedup d WHERE practicals.section_id = d.dupe_id;
UPDATE public.resources SET section_id = d.keeper_id FROM section_dedup d WHERE resources.section_id = d.dupe_id;
UPDATE public.true_false_questions SET section_id = d.keeper_id FROM section_dedup d WHERE true_false_questions.section_id = d.dupe_id;
UPDATE public.virtual_patient_cases SET section_id = d.keeper_id FROM section_dedup d WHERE virtual_patient_cases.section_id = d.dupe_id;
UPDATE public.interactive_algorithms SET section_id = d.keeper_id FROM section_dedup d WHERE interactive_algorithms.section_id = d.dupe_id;
UPDATE public.lectures SET section_id = d.keeper_id FROM section_dedup d WHERE lectures.section_id = d.dupe_id;

-- lecture_sections is a junction table with (lecture_id, section_id)
-- Update section_id, but handle potential conflicts by deleting dupes that would collide
DELETE FROM public.lecture_sections ls
USING section_dedup d
WHERE ls.section_id = d.dupe_id
  AND EXISTS (
    SELECT 1 FROM public.lecture_sections ls2
    WHERE ls2.lecture_id = ls.lecture_id AND ls2.section_id = d.keeper_id
  );
UPDATE public.lecture_sections SET section_id = d.keeper_id FROM section_dedup d WHERE lecture_sections.section_id = d.dupe_id;

-- Step 3: Delete duplicate sections
DELETE FROM public.sections WHERE id IN (SELECT dupe_id FROM section_dedup);

-- Step 4: Add unique indexes to prevent future duplicates
CREATE UNIQUE INDEX idx_sections_unique_chapter_name
  ON public.sections (chapter_id, LOWER(TRIM(name)))
  WHERE chapter_id IS NOT NULL;

CREATE UNIQUE INDEX idx_sections_unique_topic_name
  ON public.sections (topic_id, LOWER(TRIM(name)))
  WHERE topic_id IS NOT NULL;

-- Cleanup
DROP TABLE section_dedup;
