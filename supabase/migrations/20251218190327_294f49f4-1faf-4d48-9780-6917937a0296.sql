-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles table access
-- Currently any authenticated user can read all profiles including emails

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Platform admins can view all profiles (for user management)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_platform_admin_or_higher(auth.uid()));