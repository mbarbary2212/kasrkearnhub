-- =============================================
-- Part 1: Schema Changes Only (no data operations)
-- =============================================

-- 1. Add case_mode column
ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS case_mode text DEFAULT 'practice_case';

-- 2. Add patient demographic fields
ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS patient_name text;

ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS patient_age integer;

ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS patient_gender text;

ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS patient_image_url text;

-- 3. Add legacy_case_scenario_id for migration mapping
ALTER TABLE virtual_patient_cases
ADD COLUMN IF NOT EXISTS legacy_case_scenario_id uuid;

-- 4. Update stage_type constraint to allow 'read_only'
ALTER TABLE virtual_patient_stages
DROP CONSTRAINT IF EXISTS virtual_patient_stages_stage_type_check;

ALTER TABLE virtual_patient_stages
DROP CONSTRAINT IF EXISTS valid_stage_type;

ALTER TABLE virtual_patient_stages
ADD CONSTRAINT virtual_patient_stages_stage_type_check
CHECK (stage_type IN ('mcq', 'multi_select', 'short_answer', 'read_only'));

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_patient_cases_case_mode 
ON virtual_patient_cases(case_mode);

CREATE INDEX IF NOT EXISTS idx_virtual_patient_cases_legacy_id 
ON virtual_patient_cases(legacy_case_scenario_id) 
WHERE legacy_case_scenario_id IS NOT NULL;