-- Make topic_id nullable on all content tables to support chapter-based uploads
-- This allows content to be uploaded from chapter pages without requiring a topic

-- lectures table
ALTER TABLE public.lectures 
  ALTER COLUMN topic_id DROP NOT NULL;

-- resources table
ALTER TABLE public.resources 
  ALTER COLUMN topic_id DROP NOT NULL;

-- mcq_sets table
ALTER TABLE public.mcq_sets 
  ALTER COLUMN topic_id DROP NOT NULL;

-- essays table
ALTER TABLE public.essays 
  ALTER COLUMN topic_id DROP NOT NULL;

-- practicals table
ALTER TABLE public.practicals 
  ALTER COLUMN topic_id DROP NOT NULL;

-- clinical_cases table
ALTER TABLE public.clinical_cases 
  ALTER COLUMN topic_id DROP NOT NULL;

-- Add indexes for better query performance on content filtering
CREATE INDEX IF NOT EXISTS idx_lectures_module_id ON public.lectures(module_id);
CREATE INDEX IF NOT EXISTS idx_lectures_chapter_id ON public.lectures(chapter_id);
CREATE INDEX IF NOT EXISTS idx_resources_module_id ON public.resources(module_id);
CREATE INDEX IF NOT EXISTS idx_resources_chapter_id ON public.resources(chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_module_id ON public.mcq_sets(module_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_chapter_id ON public.mcq_sets(chapter_id);
CREATE INDEX IF NOT EXISTS idx_essays_module_id ON public.essays(module_id);
CREATE INDEX IF NOT EXISTS idx_essays_chapter_id ON public.essays(chapter_id);
CREATE INDEX IF NOT EXISTS idx_practicals_module_id ON public.practicals(module_id);
CREATE INDEX IF NOT EXISTS idx_practicals_chapter_id ON public.practicals(chapter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_module_id ON public.clinical_cases(module_id);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_chapter_id ON public.clinical_cases(chapter_id);