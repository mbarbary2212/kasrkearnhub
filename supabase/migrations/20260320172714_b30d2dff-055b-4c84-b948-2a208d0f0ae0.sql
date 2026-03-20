-- Enum for mind map type
CREATE TYPE public.mind_map_type AS ENUM ('full', 'section', 'ultra');

-- Enum for source type
CREATE TYPE public.mind_map_source_type AS ENUM ('generated_markdown', 'legacy_html');

-- Enum for mind map status
CREATE TYPE public.mind_map_status AS ENUM ('draft', 'published');

-- Mind maps table
CREATE TABLE public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  map_type mind_map_type NOT NULL DEFAULT 'full',
  source_type mind_map_source_type NOT NULL DEFAULT 'generated_markdown',
  section_key TEXT,
  section_title TEXT,
  section_number TEXT,
  markdown_content TEXT,
  html_content TEXT,
  html_file_url TEXT,
  source_pdf_url TEXT,
  source_detection_metadata JSONB,
  prompt_version TEXT,
  status mind_map_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mind_maps_chapter_or_topic CHECK (
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR
    (chapter_id IS NULL AND topic_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_mind_maps_chapter ON public.mind_maps(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX idx_mind_maps_topic ON public.mind_maps(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX idx_mind_maps_section ON public.mind_maps(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_mind_maps_status ON public.mind_maps(status);

-- Updated_at trigger
CREATE TRIGGER mind_maps_updated_at
  BEFORE UPDATE ON public.mind_maps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

-- Students can read published maps
CREATE POLICY "Students can view published mind maps"
  ON public.mind_maps FOR SELECT TO authenticated
  USING (status = 'published');

-- Admins/teachers can manage mind maps
CREATE POLICY "Admins can manage mind maps"
  ON public.mind_maps FOR ALL TO authenticated
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Mind map prompt presets table
CREATE TABLE public.mind_map_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'full',
  system_prompt TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mind_map_prompts_valid_type CHECK (prompt_type IN ('full', 'section', 'ultra'))
);

CREATE TRIGGER mind_map_prompts_updated_at
  BEFORE UPDATE ON public.mind_map_prompts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.mind_map_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mind map prompts"
  ON public.mind_map_prompts FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Seed default prompts
INSERT INTO public.mind_map_prompts (name, prompt_type, system_prompt, is_default) VALUES
(
  'Default Full Chapter Map',
  'full',
  E'Analyze the provided PDF content and create a hierarchical mind map in Markdown compatible with Markmap.\n\nYou are a Professor of Surgery teaching undergraduate medical students.\n\nRules:\n- Return ONLY valid Markmap Markdown\n- Start with the required frontmatter:\n---\nmarkmap:\n  colorFreezeLevel: 2\n  initialExpandLevel: 2\n---\n- Use a single root heading (#) matching the chapter/topic title\n- Use ##, ###, #### for hierarchy\n- Focus on: classifications, mechanisms, indications, complications, clinical relationships\n- Keep nodes concise and exam-oriented\n- No explanatory text before or after the markdown',
  true
),
(
  'Default Section Map',
  'section',
  E'Analyze the provided section content and create a focused hierarchical mind map in Markdown compatible with Markmap.\n\nYou are a Professor of Surgery teaching undergraduate medical students.\n\nRules:\n- Return ONLY valid Markmap Markdown\n- Start with the required frontmatter:\n---\nmarkmap:\n  colorFreezeLevel: 2\n  initialExpandLevel: 2\n---\n- Use a single root heading (#) matching the section title\n- Use ##, ###, #### for deeper hierarchy\n- Be more detailed than the full chapter map since this covers a single section\n- Focus on: key concepts, pathophysiology, diagnosis, management, and clinical pearls\n- Keep nodes concise and exam-oriented\n- No explanatory text before or after the markdown',
  true
);