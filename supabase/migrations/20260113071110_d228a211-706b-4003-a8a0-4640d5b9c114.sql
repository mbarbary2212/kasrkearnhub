-- Create function to check if user is a topic admin
CREATE OR REPLACE FUNCTION public.is_topic_admin_for(_user_id uuid, _topic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.topic_admins
    WHERE user_id = _user_id
      AND topic_id = _topic_id
  )
$$;

-- Create function to check if user is a chapter admin
CREATE OR REPLACE FUNCTION public.is_chapter_admin_for(_user_id uuid, _chapter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.topic_admins
    WHERE user_id = _user_id
      AND chapter_id = _chapter_id
  )
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can insert admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can update admin documents" ON public.admin_documents;
DROP POLICY IF EXISTS "Admins can delete admin documents" ON public.admin_documents;

-- Policy for SELECT: Strict visibility based on admin level
CREATE POLICY "Admins can view admin documents"
ON public.admin_documents
FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND module_id IS NOT NULL
    AND is_module_admin_for(auth.uid(), module_id)
  )
  OR (
    topic_id IS NOT NULL
    AND is_topic_admin_for(auth.uid(), topic_id)
  )
  OR (
    chapter_id IS NOT NULL
    AND is_chapter_admin_for(auth.uid(), chapter_id)
  )
);

-- Policy for INSERT
CREATE POLICY "Admins can insert admin documents"
ON public.admin_documents
FOR INSERT
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND module_id IS NOT NULL
    AND is_module_admin_for(auth.uid(), module_id)
  )
  OR (
    topic_id IS NOT NULL
    AND is_topic_admin_for(auth.uid(), topic_id)
  )
  OR (
    chapter_id IS NOT NULL
    AND is_chapter_admin_for(auth.uid(), chapter_id)
  )
);

-- Policy for UPDATE
CREATE POLICY "Admins can update admin documents"
ON public.admin_documents
FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND module_id IS NOT NULL
    AND is_module_admin_for(auth.uid(), module_id)
  )
  OR (
    topic_id IS NOT NULL
    AND is_topic_admin_for(auth.uid(), topic_id)
  )
  OR (
    chapter_id IS NOT NULL
    AND is_chapter_admin_for(auth.uid(), chapter_id)
  )
);

-- Policy for DELETE
CREATE POLICY "Admins can delete admin documents"
ON public.admin_documents
FOR DELETE
USING (
  is_platform_admin_or_higher(auth.uid())
  OR (
    is_any_module_admin(auth.uid())
    AND module_id IS NOT NULL
    AND is_module_admin_for(auth.uid(), module_id)
  )
  OR (
    topic_id IS NOT NULL
    AND is_topic_admin_for(auth.uid(), topic_id)
  )
  OR (
    chapter_id IS NOT NULL
    AND is_chapter_admin_for(auth.uid(), chapter_id)
  )
);