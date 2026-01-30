-- Create impersonation sessions table for admin impersonation of students
CREATE TABLE public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  ended_at TIMESTAMPTZ,
  end_reason TEXT CHECK (end_reason IN ('manual', 'expired', 'logout', 'new_session')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PARTIAL UNIQUE INDEX: Ensure only one active impersonation per admin
CREATE UNIQUE INDEX one_active_impersonation_per_actor
ON public.impersonation_sessions(actor_id)
WHERE ended_at IS NULL;

-- Index for efficient lookups by effective user
CREATE INDEX idx_impersonation_sessions_effective_user 
ON public.impersonation_sessions(effective_user_id);

-- Index for expiry checks
CREATE INDEX idx_impersonation_sessions_expires 
ON public.impersonation_sessions(expires_at)
WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- NO DIRECT CLIENT ACCESS - all operations via Edge Functions
-- This policy ensures clients CANNOT query this table directly
CREATE POLICY "No direct client access"
ON public.impersonation_sessions
FOR ALL
TO authenticated
USING (false);