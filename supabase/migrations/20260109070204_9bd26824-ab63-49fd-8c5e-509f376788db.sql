-- Allow module admins to view profiles of topic admins in their modules
CREATE POLICY "Module admins can view topic admin profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.module_admins ma
    JOIN public.topic_admins ta ON ta.module_id = ma.module_id
    WHERE ma.user_id = auth.uid()
    AND ta.user_id = profiles.id
  )
);