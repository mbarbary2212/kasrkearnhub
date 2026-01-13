-- Create private storage bucket for admin PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-pdfs', 'admin-pdfs', false);

-- Create admin_documents table
CREATE TABLE public.admin_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  doc_type text DEFAULT 'chapter_pdf',
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  storage_bucket text NOT NULL DEFAULT 'admin-pdfs',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.admin_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Only platform admins and super admins can SELECT
CREATE POLICY "Admins can view admin documents"
ON public.admin_documents
FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- RLS: Only platform admins and super admins can INSERT
CREATE POLICY "Admins can create admin documents"
ON public.admin_documents
FOR INSERT
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- RLS: Only platform admins and super admins can UPDATE
CREATE POLICY "Admins can update admin documents"
ON public.admin_documents
FOR UPDATE
USING (is_platform_admin_or_higher(auth.uid()));

-- Storage policies for admin-pdfs bucket (private, admin-only)
CREATE POLICY "Admins can upload to admin-pdfs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admin-pdfs' 
  AND is_platform_admin_or_higher(auth.uid())
);

CREATE POLICY "Admins can view admin-pdfs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'admin-pdfs' 
  AND is_platform_admin_or_higher(auth.uid())
);

CREATE POLICY "Admins can update admin-pdfs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'admin-pdfs' 
  AND is_platform_admin_or_higher(auth.uid())
);

CREATE POLICY "Admins can delete admin-pdfs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'admin-pdfs' 
  AND is_platform_admin_or_higher(auth.uid())
);

-- Create index for faster queries
CREATE INDEX idx_admin_documents_module ON public.admin_documents(module_id) WHERE is_deleted = false;
CREATE INDEX idx_admin_documents_chapter ON public.admin_documents(chapter_id) WHERE is_deleted = false;
CREATE INDEX idx_admin_documents_doc_type ON public.admin_documents(doc_type) WHERE is_deleted = false;