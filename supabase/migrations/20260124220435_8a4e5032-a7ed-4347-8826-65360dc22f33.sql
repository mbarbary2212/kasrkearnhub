-- Add section_id column to virtual_patient_cases (the consolidated clinical cases table)
ALTER TABLE public.virtual_patient_cases
ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL;

-- Create index for filtering performance
CREATE INDEX IF NOT EXISTS idx_virtual_patient_cases_section_id
ON public.virtual_patient_cases(section_id);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';