-- Set all existing cases to AI-driven
UPDATE virtual_patient_cases SET is_ai_driven = true WHERE is_ai_driven = false OR is_ai_driven IS NULL;

-- Set default for new cases
ALTER TABLE virtual_patient_cases ALTER COLUMN is_ai_driven SET DEFAULT true;