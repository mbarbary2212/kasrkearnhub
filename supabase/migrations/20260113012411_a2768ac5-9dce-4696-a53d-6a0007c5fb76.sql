-- Add rubric column to virtual_patient_stages table for short answer grading
ALTER TABLE public.virtual_patient_stages
ADD COLUMN IF NOT EXISTS rubric jsonb DEFAULT NULL;