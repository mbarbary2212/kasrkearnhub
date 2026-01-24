-- Add section_id column to mcqs table
ALTER TABLE public.mcqs 
ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_mcqs_section_id ON public.mcqs(section_id);