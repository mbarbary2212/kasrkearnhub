
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
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = ma.user_id
        AND ur.role IN ('platform_admin', 'super_admin')
    )
$$;

REVOKE ALL ON FUNCTION public.get_module_leads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_module_leads(uuid) TO authenticated;
