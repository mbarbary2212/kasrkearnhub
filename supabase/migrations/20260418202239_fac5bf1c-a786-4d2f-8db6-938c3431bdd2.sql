CREATE POLICY "Users can delete their own chapter attempts"
ON public.chapter_attempts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);