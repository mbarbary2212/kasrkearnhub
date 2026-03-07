
-- 1. Storage policies for examiner-avatars/ folder (admins only)
CREATE POLICY "Admins can upload examiner avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'examiner-avatars'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'platform_admin')
  )
);

CREATE POLICY "Admins can update examiner avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'examiner-avatars'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'platform_admin')
  )
);

CREATE POLICY "Admins can delete examiner avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'examiner-avatars'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'platform_admin')
  )
);

-- 2. Set bucket file size limit (2MB) and allowed mime types
UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'avatars';

-- 3. Create leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_case_leaderboard(p_case_id uuid)
RETURNS TABLE(rank bigint, display_name text, best_score numeric, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY MAX(a.score) DESC, MIN(a.completed_at) ASC) as rank,
    CONCAT(
      SPLIT_PART(COALESCE(p.full_name, p.email), ' ', 1),
      CASE WHEN SPLIT_PART(COALESCE(p.full_name, ''), ' ', 2) != ''
           THEN ' ' || LEFT(SPLIT_PART(p.full_name, ' ', 2), 1) || '.'
           ELSE '' END
    ) as display_name,
    MAX(a.score) as best_score,
    a.user_id
  FROM virtual_patient_attempts a
  JOIN profiles p ON p.id = a.user_id
  WHERE a.case_id = p_case_id
    AND a.is_completed = true
    AND a.score IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = a.user_id
        AND ur.role IN ('super_admin', 'platform_admin', 'admin', 'teacher')
    )
  GROUP BY a.user_id, p.full_name, p.email
  ORDER BY best_score DESC, MIN(a.completed_at) ASC
  LIMIT 10;
$$;
