-- Add partial unique index to prevent multiple pending access requests for the same email
-- This replaces the non-functional unique constraint with a proper partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_email_pending_unique 
ON public.access_requests (lower(email)) 
WHERE status = 'pending';