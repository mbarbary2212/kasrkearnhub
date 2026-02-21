-- Add icon_url column to module_chapters
ALTER TABLE module_chapters ADD COLUMN icon_url text;

-- Create chapter-icons storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chapter-icons', 'chapter-icons', true);

-- Allow public read access
CREATE POLICY "Chapter icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-icons');

-- Allow admins to upload
CREATE POLICY "Admins can upload chapter icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chapter-icons' AND public.is_platform_admin_or_higher(auth.uid()));

-- Allow admins to update
CREATE POLICY "Admins can update chapter icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chapter-icons' AND public.is_platform_admin_or_higher(auth.uid()));

-- Allow admins to delete
CREATE POLICY "Admins can delete chapter icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'chapter-icons' AND public.is_platform_admin_or_higher(auth.uid()));