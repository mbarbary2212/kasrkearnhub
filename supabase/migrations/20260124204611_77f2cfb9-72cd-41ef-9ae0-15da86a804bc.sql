-- Create sections table
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sections_scope_check CHECK (
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR 
    (chapter_id IS NULL AND topic_id IS NOT NULL)
  )
);

-- Add enable_sections to module_chapters
ALTER TABLE public.module_chapters ADD COLUMN enable_sections BOOLEAN NOT NULL DEFAULT false;

-- Add enable_sections to topics
ALTER TABLE public.topics ADD COLUMN enable_sections BOOLEAN NOT NULL DEFAULT false;

-- Add section_id to all content tables
ALTER TABLE public.lectures ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.resources ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.mcq_sets ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.essays ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.practicals ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.clinical_cases ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.study_resources ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.osce_questions ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.matching_questions ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- Enable RLS on sections table
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for sections
CREATE POLICY "Anyone can view sections"
  ON public.sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sections"
  ON public.sections FOR ALL
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
    OR (topic_id IS NOT NULL AND can_manage_topic_content(auth.uid(), topic_id))
  );

-- Create indexes for better query performance
CREATE INDEX idx_sections_chapter_id ON public.sections(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX idx_sections_topic_id ON public.sections(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX idx_lectures_section_id ON public.lectures(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_resources_section_id ON public.resources(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_mcq_sets_section_id ON public.mcq_sets(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_essays_section_id ON public.essays(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_practicals_section_id ON public.practicals(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_clinical_cases_section_id ON public.clinical_cases(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_study_resources_section_id ON public.study_resources(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_osce_questions_section_id ON public.osce_questions(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_matching_questions_section_id ON public.matching_questions(section_id) WHERE section_id IS NOT NULL;