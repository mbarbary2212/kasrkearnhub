-- Create OSCE questions table with new structure
CREATE TABLE public.osce_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  
  -- Image and history
  image_url TEXT NOT NULL,
  history_text TEXT NOT NULL,
  
  -- 5 statements (required)
  statement_1 TEXT NOT NULL,
  statement_2 TEXT NOT NULL,
  statement_3 TEXT NOT NULL,
  statement_4 TEXT NOT NULL,
  statement_5 TEXT NOT NULL,
  
  -- 5 answers (T/F, required)
  answer_1 BOOLEAN NOT NULL,
  answer_2 BOOLEAN NOT NULL,
  answer_3 BOOLEAN NOT NULL,
  answer_4 BOOLEAN NOT NULL,
  answer_5 BOOLEAN NOT NULL,
  
  -- Optional explanations (admin only)
  explanation_1 TEXT,
  explanation_2 TEXT,
  explanation_3 TEXT,
  explanation_4 TEXT,
  explanation_5 TEXT,
  
  -- Metadata
  display_order INTEGER DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  legacy_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_osce_questions_chapter_id ON public.osce_questions(chapter_id);
CREATE INDEX idx_osce_questions_module_id ON public.osce_questions(module_id);

-- Create unique constraint for deduplication during bulk import
-- This uses a hash of history_text combined with module_id, chapter_id, and image filename
CREATE UNIQUE INDEX idx_osce_unique_question ON public.osce_questions(module_id, chapter_id, md5(history_text || image_url))
  WHERE is_deleted = false AND legacy_archived = false;

-- Enable RLS
ALTER TABLE public.osce_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view osce_questions"
  ON public.osce_questions
  FOR SELECT
  USING (is_deleted = false AND legacy_archived = false);

CREATE POLICY "Content managers can manage osce_questions"
  ON public.osce_questions
  FOR ALL
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
    OR is_module_admin(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  )
  WITH CHECK (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
    OR is_module_admin(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
  );

-- Create storage bucket for OSCE images
INSERT INTO storage.buckets (id, name, public)
VALUES ('osce-images', 'osce-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for osce-images bucket
CREATE POLICY "Anyone can view OSCE images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'osce-images');

CREATE POLICY "Admins can upload OSCE images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'osce-images' 
    AND (
      is_platform_admin_or_higher(auth.uid())
      OR has_role(auth.uid(), 'teacher')
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins can update OSCE images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'osce-images' 
    AND (
      is_platform_admin_or_higher(auth.uid())
      OR has_role(auth.uid(), 'teacher')
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins can delete OSCE images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'osce-images' 
    AND (
      is_platform_admin_or_higher(auth.uid())
      OR has_role(auth.uid(), 'teacher')
      OR has_role(auth.uid(), 'admin')
    )
  );

-- Function to archive legacy OSCE/practical questions (super admin only)
CREATE OR REPLACE FUNCTION public.archive_legacy_osce_questions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Check caller is super_admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can archive legacy OSCE questions';
  END IF;
  
  -- Mark all practicals as legacy_archived (these are old OSCE format)
  UPDATE public.practicals
  SET is_deleted = true
  WHERE is_deleted = false;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log to audit
  PERFORM log_audit_event(
    'ARCHIVE_LEGACY_OSCE',
    'practicals',
    NULL,
    jsonb_build_object('archived_count', archived_count)
  );
  
  RETURN archived_count;
END;
$$;

-- Trigger to update updated_at on osce_questions
CREATE TRIGGER update_osce_questions_updated_at
  BEFORE UPDATE ON public.osce_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();