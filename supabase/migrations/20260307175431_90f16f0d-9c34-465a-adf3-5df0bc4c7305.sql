ALTER TABLE public.virtual_patient_cases
  DROP CONSTRAINT virtual_patient_cases_avatar_id_check;

ALTER TABLE public.virtual_patient_cases
  ADD CONSTRAINT virtual_patient_cases_avatar_id_check
  CHECK (avatar_id >= 1);