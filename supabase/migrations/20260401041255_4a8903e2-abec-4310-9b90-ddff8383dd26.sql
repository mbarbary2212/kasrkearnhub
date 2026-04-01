
-- Add section_id column to chapter_blueprint_config
ALTER TABLE public.chapter_blueprint_config
  ADD COLUMN section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE DEFAULT NULL;

-- Drop the old unique constraint
ALTER TABLE public.chapter_blueprint_config
  DROP CONSTRAINT IF EXISTS chapter_blueprint_config_chapter_exam_type_component_key;

-- Create a unique index using COALESCE to handle NULLs properly
CREATE UNIQUE INDEX chapter_blueprint_config_unique_key
  ON public.chapter_blueprint_config (
    chapter_id,
    COALESCE(section_id, '00000000-0000-0000-0000-000000000000'),
    exam_type,
    component_type
  );
