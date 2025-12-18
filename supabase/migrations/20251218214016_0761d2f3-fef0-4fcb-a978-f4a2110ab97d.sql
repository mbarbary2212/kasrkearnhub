-- Create enum for resource types
CREATE TYPE public.study_resource_type AS ENUM ('flashcard', 'table', 'algorithm', 'exam_tip', 'key_image');

-- Create study_settings table for global settings like disclaimer
CREATE TABLE public.study_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default disclaimer
INSERT INTO study_settings (key, value) VALUES (
  'disclaimer',
  'Important: These resources are NOT a replacement for the textbook or lectures. They are intended to support revision, memorization, and exam preparation only.'
);

-- Enable RLS on study_settings
ALTER TABLE public.study_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view study_settings"
  ON public.study_settings FOR SELECT
  USING (true);

-- Only super admins can update settings
CREATE POLICY "Super admins can manage study_settings"
  ON public.study_settings FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create the main study_resources table
CREATE TABLE public.study_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  resource_type study_resource_type NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_study_resources_chapter ON public.study_resources(chapter_id);
CREATE INDEX idx_study_resources_module ON public.study_resources(module_id);
CREATE INDEX idx_study_resources_type ON public.study_resources(resource_type);
CREATE INDEX idx_study_resources_order ON public.study_resources(chapter_id, resource_type, display_order);

-- Enable RLS
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-deleted resources
CREATE POLICY "Anyone can view study_resources"
  ON public.study_resources FOR SELECT
  USING (is_deleted = false);

-- Admins can manage resources
CREATE POLICY "Admins can manage study_resources"
  ON public.study_resources FOR ALL
  USING (
    is_platform_admin_or_higher(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_manage_module_content(auth.uid(), module_id)
  );

-- Create storage bucket for resource images
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-resources', 'study-resources', true);

-- Storage policies for the bucket
CREATE POLICY "Anyone can view study resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-resources');

CREATE POLICY "Admins can upload study resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can update study resource files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can delete study resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_study_resources_updated_at
  BEFORE UPDATE ON public.study_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();