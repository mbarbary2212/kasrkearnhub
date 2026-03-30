-- Step 1: Add exam_type column to chapter_blueprint_config
ALTER TABLE chapter_blueprint_config ADD COLUMN exam_type text;

-- Step 2: Migrate existing data by mapping assessment_type to exam_type
UPDATE chapter_blueprint_config cbc
SET exam_type = CASE 
  WHEN s.assessment_type IN ('final_written', 'formative', 'module_exam') THEN 'written'
  WHEN s.assessment_type = 'final_practical' THEN 'clinical'
  ELSE 'written'
END
FROM assessment_structures s
WHERE cbc.assessment_id = s.id;

-- Fallback for any unmapped rows
UPDATE chapter_blueprint_config SET exam_type = 'written' WHERE exam_type IS NULL;

-- Step 3: Remove short_case entries
DELETE FROM chapter_blueprint_config WHERE component_type = 'short_case';

-- Step 4: Handle potential duplicates after exam_type migration
-- Keep only the first row per (chapter_id, exam_type, component_type)
DELETE FROM chapter_blueprint_config a
USING chapter_blueprint_config b
WHERE a.id > b.id
  AND a.chapter_id = b.chapter_id
  AND a.exam_type = b.exam_type
  AND a.component_type = b.component_type;

-- Step 5: Make exam_type NOT NULL
ALTER TABLE chapter_blueprint_config ALTER COLUMN exam_type SET NOT NULL;

-- Step 6: Drop old FK and unique constraints
ALTER TABLE chapter_blueprint_config DROP CONSTRAINT IF EXISTS chapter_blueprint_config_assessment_id_fkey;
ALTER TABLE chapter_blueprint_config DROP CONSTRAINT IF EXISTS chapter_blueprint_config_chapter_id_assessment_id_component_key;

-- Step 7: Drop assessment_id column
ALTER TABLE chapter_blueprint_config DROP COLUMN assessment_id;

-- Step 8: Add new unique constraint
ALTER TABLE chapter_blueprint_config ADD CONSTRAINT chapter_blueprint_config_chapter_exam_type_component_key
  UNIQUE (chapter_id, exam_type, component_type);

-- Step 9: Add exam_type column to assessment_structures
ALTER TABLE assessment_structures ADD COLUMN exam_type text NOT NULL DEFAULT 'written';

-- Step 10: Populate exam_type in assessment_structures from assessment_type
UPDATE assessment_structures SET exam_type = CASE 
  WHEN assessment_type IN ('final_written', 'formative', 'module_exam') THEN 'written'
  WHEN assessment_type = 'final_practical' THEN 'clinical'
  ELSE 'written'
END;