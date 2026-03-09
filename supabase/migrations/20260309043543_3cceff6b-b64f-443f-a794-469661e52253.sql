-- Create a public bucket for case section images (x-rays, wound photos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('case-images', 'case-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload case images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'case-images');

-- Anyone can view case images (students need to see them)
CREATE POLICY "Anyone can view case images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'case-images');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete case images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'case-images');