-- Allow super admins to upload avatars for any user
CREATE POLICY "Super admins can upload user avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super admins to update user avatars
CREATE POLICY "Super admins can update user avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super admins to delete user avatars
CREATE POLICY "Super admins can delete user avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND public.has_role(auth.uid(), 'super_admin'::app_role)
);