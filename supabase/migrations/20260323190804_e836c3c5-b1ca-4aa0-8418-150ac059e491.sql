-- Drop and recreate policies for curriculum-images bucket (safe since first migration partially failed)
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Public read access for curriculum images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can manage curriculum images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update curriculum images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete curriculum images" ON storage.objects;
END $$;

-- RLS: Allow public read
CREATE POLICY "Public read access for curriculum images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'curriculum-images');

-- RLS: Allow admins to insert
CREATE POLICY "Admins can manage curriculum images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculum-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- RLS: Allow admins to update
CREATE POLICY "Admins can update curriculum images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculum-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- RLS: Allow admins to delete
CREATE POLICY "Admins can delete curriculum images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculum-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);