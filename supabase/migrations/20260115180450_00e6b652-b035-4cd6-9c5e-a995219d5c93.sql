-- ============================================
-- Fix storage permissions for all content managers
-- and add folder support for study resources
-- ============================================

-- ============================================
-- PART 1: Fix study-resources bucket policies
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can upload study resource files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update study resource files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete study resource files" ON storage.objects;

-- Create new inclusive policies for study-resources
CREATE POLICY "Content managers can upload study resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

CREATE POLICY "Content managers can update study resource files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

CREATE POLICY "Content managers can delete study resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'study-resources' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

-- ============================================
-- PART 2: Fix admin-pdfs bucket policies
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can upload to admin-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view admin-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update admin-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete admin-pdfs" ON storage.objects;

-- Create new inclusive policies for admin-pdfs
CREATE POLICY "Content managers can upload to admin-pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'admin-pdfs' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

CREATE POLICY "Content managers can view admin-pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'admin-pdfs' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

CREATE POLICY "Content managers can update admin-pdfs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'admin-pdfs' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

CREATE POLICY "Content managers can delete admin-pdfs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'admin-pdfs' 
    AND (
      is_platform_admin_or_higher(auth.uid()) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
      OR is_any_module_admin(auth.uid())
    )
  );

-- ============================================
-- PART 3: Fix admin_documents INSERT policy
-- ============================================

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can create admin documents" ON public.admin_documents;

-- ============================================
-- PART 4: Add folder column to study_resources
-- ============================================

ALTER TABLE public.study_resources
ADD COLUMN IF NOT EXISTS folder text DEFAULT NULL;

-- Create index for efficient folder queries
CREATE INDEX IF NOT EXISTS idx_study_resources_folder 
  ON public.study_resources(chapter_id, resource_type, folder);