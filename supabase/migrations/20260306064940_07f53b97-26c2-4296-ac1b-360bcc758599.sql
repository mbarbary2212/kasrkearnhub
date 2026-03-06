-- Soft-delete all legacy cases that lack generated_case_data (old format)
UPDATE public.virtual_patient_cases
SET is_deleted = true
WHERE is_deleted = false
  AND generated_case_data IS NULL;