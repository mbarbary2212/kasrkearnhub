CREATE OR REPLACE FUNCTION public.get_module_leads(_module_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.avatar_url,
    p.email
  FROM public.module_admins ma
  JOIN public.profiles p ON p.id = ma.user_id
  WHERE ma.module_id = _module_id
$$;

REVOKE ALL ON FUNCTION public.get_module_leads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_module_leads(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chapter_leads(_chapter_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.avatar_url,
    p.email
  FROM public.topic_admins ta
  JOIN public.profiles p ON p.id = ta.user_id
  WHERE ta.chapter_id = _chapter_id
$$;

REVOKE ALL ON FUNCTION public.get_chapter_leads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_leads(uuid) TO authenticated;