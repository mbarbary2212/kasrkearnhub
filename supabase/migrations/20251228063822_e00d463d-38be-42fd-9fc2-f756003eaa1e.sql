-- Create table for admin help files
CREATE TABLE public.admin_help_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('guide', 'template')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  template_type TEXT, -- For templates: 'mcq', 'matching', 'essay', 'case_scenario', 'osce', 'flashcard'
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.admin_help_files ENABLE ROW LEVEL SECURITY;

-- Policy: All admins can view files
CREATE POLICY "Admins can view help files"
ON public.admin_help_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('department_admin', 'platform_admin', 'super_admin')
  )
);

-- Policy: Only platform_admin and super_admin can insert
CREATE POLICY "Platform admins can insert help files"
ON public.admin_help_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);

-- Policy: Only platform_admin and super_admin can update
CREATE POLICY "Platform admins can update help files"
ON public.admin_help_files
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);

-- Policy: Only platform_admin and super_admin can delete
CREATE POLICY "Platform admins can delete help files"
ON public.admin_help_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);

-- Create storage bucket for admin files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('admin-templates', 'admin-templates', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-templates bucket
CREATE POLICY "Admins can view admin template files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'admin-templates'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('department_admin', 'platform_admin', 'super_admin')
  )
);

CREATE POLICY "Platform admins can upload admin template files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admin-templates'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);

CREATE POLICY "Platform admins can update admin template files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'admin-templates'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);

CREATE POLICY "Platform admins can delete admin template files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'admin-templates'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_admin', 'super_admin')
  )
);