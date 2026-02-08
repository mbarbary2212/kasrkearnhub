-- Create access_requests table for user access request workflow
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_title TEXT,
  request_type TEXT DEFAULT 'student',
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index for pending requests by email to prevent duplicates
CREATE UNIQUE INDEX idx_access_requests_email_pending 
ON public.access_requests(email) 
WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to submit access requests
CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only platform_admin and super_admin can view access requests
CREATE POLICY "Admins can view access requests"
ON public.access_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('platform_admin', 'super_admin')
  )
);

-- Only platform_admin and super_admin can update access requests
CREATE POLICY "Admins can update access requests"
ON public.access_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('platform_admin', 'super_admin')
  )
);

-- Only platform_admin and super_admin can delete access requests
CREATE POLICY "Admins can delete access requests"
ON public.access_requests
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('platform_admin', 'super_admin')
  )
);