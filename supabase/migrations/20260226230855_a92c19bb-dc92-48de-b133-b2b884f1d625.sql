ALTER TABLE public.virtual_patient_cases
  ADD COLUMN IF NOT EXISTS avatar_id integer DEFAULT 1
    CHECK (avatar_id BETWEEN 1 AND 4);