CREATE OR REPLACE FUNCTION public.get_thread_authors(thread_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT DISTINCT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  JOIN public.discussion_threads t ON t.created_by = p.id
  WHERE t.id = ANY(thread_ids) AND p.status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.get_thread_authors(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_thread_authors(uuid[]) TO authenticated;

-- DOWN: DROP FUNCTION IF EXISTS public.get_thread_authors(uuid[]);