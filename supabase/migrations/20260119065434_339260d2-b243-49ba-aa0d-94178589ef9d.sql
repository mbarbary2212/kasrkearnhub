-- Allow module admins to view all profiles for assignment purposes
CREATE POLICY "Module admins can view all profiles for assignment"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.module_admins
    WHERE module_admins.user_id = auth.uid()
  )
);