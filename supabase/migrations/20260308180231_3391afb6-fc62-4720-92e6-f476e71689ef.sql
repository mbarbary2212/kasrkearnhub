CREATE POLICY "Anyone can view active avatars"
ON public.examiner_avatars
FOR SELECT
TO anon
USING (is_active = true);