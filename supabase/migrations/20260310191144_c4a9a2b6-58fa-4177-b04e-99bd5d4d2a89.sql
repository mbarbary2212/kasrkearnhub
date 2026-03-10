
-- Clean up orphaned data linked to soft-deleted cases
DELETE FROM virtual_patient_attempts
WHERE case_id IN (SELECT id FROM virtual_patient_cases WHERE is_deleted = true);

DELETE FROM virtual_patient_stages
WHERE case_id IN (SELECT id FROM virtual_patient_cases WHERE is_deleted = true);

DELETE FROM case_section_answers
WHERE attempt_id IN (
  SELECT a.id FROM virtual_patient_attempts a
  JOIN virtual_patient_cases c ON c.id = a.case_id
  WHERE c.is_deleted = true
);

DELETE FROM ai_case_messages
WHERE attempt_id IN (
  SELECT a.id FROM virtual_patient_attempts a
  JOIN virtual_patient_cases c ON c.id = a.case_id
  WHERE c.is_deleted = true
);

-- Delete the soft-deleted cases themselves
DELETE FROM virtual_patient_cases WHERE is_deleted = true;
