

# Fix: Year Image Upload Failing

## Root Cause
The `curriculum-images` storage bucket is missing an **INSERT** RLS policy. There are policies for SELECT (public), UPDATE (admins), and DELETE (admins), but no INSERT policy -- so file uploads are silently rejected by Supabase.

## Fix
Create a migration that adds an INSERT policy for authenticated admins on the `curriculum-images` bucket:

**New migration file:**
```sql
CREATE POLICY "Admins can upload curriculum images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculum-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
```

This single migration is the only change needed. The upload code and UI are already correct.

