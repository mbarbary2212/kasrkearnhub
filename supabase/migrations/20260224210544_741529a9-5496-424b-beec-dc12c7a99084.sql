
-- Interactive Algorithms table (decision-tree based)
CREATE TABLE public.interactive_algorithms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  algorithm_json JSONB NOT NULL DEFAULT '{"nodes":[],"start_node_id":null}'::jsonb,
  description TEXT,
  display_order INT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interactive_algorithms ENABLE ROW LEVEL SECURITY;

-- Students can view non-deleted algorithms
CREATE POLICY "Anyone can view active algorithms"
  ON public.interactive_algorithms FOR SELECT
  USING (is_deleted = false);

-- Admins can manage algorithms
CREATE POLICY "Admins can insert algorithms"
  ON public.interactive_algorithms FOR INSERT
  WITH CHECK (
    can_manage_module_content(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  );

CREATE POLICY "Admins can update algorithms"
  ON public.interactive_algorithms FOR UPDATE
  USING (
    can_manage_module_content(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  );

CREATE POLICY "Admins can delete algorithms"
  ON public.interactive_algorithms FOR DELETE
  USING (
    can_manage_module_content(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  );

-- Auto-update updated_at
CREATE TRIGGER update_interactive_algorithms_updated_at
  BEFORE UPDATE ON public.interactive_algorithms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for common queries
CREATE INDEX idx_interactive_algorithms_chapter ON public.interactive_algorithms(chapter_id) WHERE is_deleted = false;
CREATE INDEX idx_interactive_algorithms_module ON public.interactive_algorithms(module_id) WHERE is_deleted = false;
