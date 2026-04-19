-- Allow super admins to manage files under team-credits/ folder in avatars bucket
create policy "Super admins can upload team credit photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'team-credits'
    and public.has_role(auth.uid(), 'super_admin'::app_role)
  );

create policy "Super admins can update team credit photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'team-credits'
    and public.has_role(auth.uid(), 'super_admin'::app_role)
  );

create policy "Super admins can delete team credit photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'team-credits'
    and public.has_role(auth.uid(), 'super_admin'::app_role)
  );