-- Create function to check if user has role department_admin (module admin)
CREATE OR REPLACE FUNCTION public.is_any_module_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'department_admin'
  )
$$;

-- Create function to check if user is module admin for a specific module (if not exists)
CREATE OR REPLACE FUNCTION public.is_module_admin_for(_user_id uuid, _module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.module_admins
    WHERE user_id = _user_id
      AND module_id = _module_id
  )
$$;

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can insert admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can update admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can delete admin documents" ON public.admin_documents;

-- Policy for SELECT: Platform admins see all, module admins see their modules' docs
CREATE POLICY "Admins can view admin documents"
ON public.admin_documents
FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND (
      module_id IS NULL
      OR is_module_admin_for(auth.uid(), module_id)
    )
  )
);

-- Policy for INSERT: Platform admins can insert any, module admins can insert for their modules
CREATE POLICY "Admins can insert admin documents"
ON public.admin_documents
FOR INSERT
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND (
      module_id IS NULL
      OR is_module_admin_for(auth.uid(), module_id)
    )
  )
);

-- Policy for UPDATE: Platform admins can update any, module admins can update their modules' docs
CREATE POLICY "Admins can update admin documents"
ON public.admin_documents
FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND (
      module_id IS NULL
      OR is_module_admin_for(auth.uid(), module_id)
    )
  )
);

-- Policy for DELETE: Platform admins can delete any, module admins can delete their modules' docs
CREATE POLICY "Admins can delete admin documents"
ON public.admin_documents
FOR DELETE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND is_module_admin_for(auth.uid(), module_id)
  )
);