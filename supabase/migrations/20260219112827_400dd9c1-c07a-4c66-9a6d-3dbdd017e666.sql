ALTER TABLE virtual_patient_cases
ADD COLUMN concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;