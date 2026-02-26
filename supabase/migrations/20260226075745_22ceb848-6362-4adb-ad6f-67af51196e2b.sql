
UPDATE virtual_patient_cases SET case_type = 'basic' WHERE case_type IN ('guided', 'management');
UPDATE virtual_patient_cases SET case_type = 'advanced' WHERE case_type IN ('simulation', 'virtual_patient');
ALTER TABLE virtual_patient_cases ALTER COLUMN case_type SET DEFAULT 'basic';
