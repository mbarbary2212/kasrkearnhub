INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'curriculum-images',
  'curriculum-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read access for curriculum images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage curriculum images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload curriculum images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update curriculum images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete curriculum images" ON storage.objects;

CREATE POLICY "Public read access for curriculum images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'curriculum-images');

CREATE POLICY "Admins can upload curriculum images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculum-images'
  AND (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'department_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can update curriculum images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculum-images'
  AND (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'department_admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'curriculum-images'
  AND (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'department_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can delete curriculum images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculum-images'
  AND (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'department_admin'::public.app_role)
  )
);