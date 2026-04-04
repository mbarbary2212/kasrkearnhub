-- Allow all authenticated users to read topic_admins (so students can see Topic Lead cards)
CREATE POLICY "Authenticated users can view topic admins"
ON public.topic_admins
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to read module_admins (so students can see Module Lead cards)
CREATE POLICY "Authenticated users can view module admins"
ON public.module_admins
FOR SELECT
TO authenticated
USING (true);