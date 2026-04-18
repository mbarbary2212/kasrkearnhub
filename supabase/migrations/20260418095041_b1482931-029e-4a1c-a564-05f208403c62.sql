
-- 1. Fix is_any_module_admin
CREATE OR REPLACE FUNCTION public.is_any_module_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.module_admins WHERE user_id = _user_id
  )
$$;

-- 2. Profiles policy hardening
DROP POLICY IF EXISTS "Module admins can view all profiles for assignment" ON public.profiles;
DROP POLICY IF EXISTS "Module admins can view profiles of their module admins" ON public.profiles;
CREATE POLICY "Module admins can view profiles of their module admins"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.module_admins ma_self
    JOIN public.module_admins ma_target
      ON ma_target.module_id = ma_self.module_id
    WHERE ma_self.user_id = auth.uid()
      AND ma_target.user_id = profiles.id
  )
);

-- 3. module_admins / topic_admins SELECT hardening
DROP POLICY IF EXISTS "Authenticated users can view module admins" ON public.module_admins;
DROP POLICY IF EXISTS "Users can view their own module admin rows" ON public.module_admins;
DROP POLICY IF EXISTS "Platform admins can view all module admins" ON public.module_admins;
DROP POLICY IF EXISTS "Module admins can view peers in same module" ON public.module_admins;

CREATE POLICY "Users can view their own module admin rows"
ON public.module_admins
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all module admins"
ON public.module_admins
FOR SELECT TO authenticated
USING (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Module admins can view peers in same module"
ON public.module_admins
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.module_admins ma
    WHERE ma.user_id = auth.uid()
      AND ma.module_id = module_admins.module_id
  )
);

DROP POLICY IF EXISTS "Authenticated users can view topic admins" ON public.topic_admins;
DROP POLICY IF EXISTS "Users can view their own topic admin rows" ON public.topic_admins;
DROP POLICY IF EXISTS "Platform admins can view all topic admins" ON public.topic_admins;

CREATE POLICY "Users can view their own topic admin rows"
ON public.topic_admins
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all topic admins"
ON public.topic_admins
FOR SELECT TO authenticated
USING (public.is_platform_admin_or_higher(auth.uid()));

-- 4. case-images storage hardening
DROP POLICY IF EXISTS "Authenticated users can delete case images" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete case-images" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update case-images" ON storage.objects;

CREATE POLICY "Owners and admins can delete case-images"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'case-images'
  AND (auth.uid() = owner OR public.is_platform_admin_or_higher(auth.uid()))
);

CREATE POLICY "Owners and admins can update case-images"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-images'
  AND (auth.uid() = owner OR public.is_platform_admin_or_higher(auth.uid()))
);
