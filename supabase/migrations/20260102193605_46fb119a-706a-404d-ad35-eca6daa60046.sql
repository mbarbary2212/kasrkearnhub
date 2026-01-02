-- =============================================
-- USER ANALYTICS + BAN/REMOVE CONTROLS
-- =============================================

-- 1) user_sessions table for tracking login/logout/usage
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer,
  client_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_seen ON public.user_sessions(last_seen_at);
CREATE INDEX idx_user_sessions_session_start ON public.user_sessions(session_start);

-- 2) admin_actions table for audit logging ban/unban/remove/restore
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('BAN', 'UNBAN', 'REMOVE', 'RESTORE')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_admin ON public.admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_created ON public.admin_actions(created_at);

-- 3) Extend profiles table with status fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'removed')),
ADD COLUMN IF NOT EXISTS banned_until timestamptz,
ADD COLUMN IF NOT EXISTS status_reason text,
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS status_updated_by uuid;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- user_sessions policies
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all sessions"
ON public.user_sessions FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- admin_actions policies (only platform_admin + super_admin)
CREATE POLICY "Platform admins can view admin actions"
ON public.admin_actions FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Platform admins can insert admin actions"
ON public.admin_actions FOR INSERT
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- Update profiles policies for status management
CREATE POLICY "Platform admins can update user status"
ON public.profiles FOR UPDATE
USING (is_platform_admin_or_higher(auth.uid()));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user status (for auth checks)
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
RETURNS TABLE (status text, banned_until timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.status, p.banned_until
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1;
$$;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND status = 'banned'
      AND (banned_until IS NULL OR banned_until > now())
  );
$$;

-- Function to check if user is removed
CREATE OR REPLACE FUNCTION public.is_user_removed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'removed'
  );
$$;

-- Function to get user analytics summary (for admin panel)
CREATE OR REPLACE FUNCTION public.get_user_analytics(_user_id uuid)
RETURNS TABLE (
  last_seen timestamptz,
  sessions_30d bigint,
  total_time_7d bigint,
  total_time_30d bigint,
  total_time_all bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT MAX(last_seen_at) FROM user_sessions WHERE user_id = _user_id) as last_seen,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = _user_id AND session_start >= now() - interval '30 days') as sessions_30d,
    (SELECT COALESCE(SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (LEAST(last_seen_at, now()) - session_start))::int)), 0) 
     FROM user_sessions WHERE user_id = _user_id AND session_start >= now() - interval '7 days') as total_time_7d,
    (SELECT COALESCE(SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (LEAST(last_seen_at, now()) - session_start))::int)), 0) 
     FROM user_sessions WHERE user_id = _user_id AND session_start >= now() - interval '30 days') as total_time_30d,
    (SELECT COALESCE(SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (LEAST(last_seen_at, now()) - session_start))::int)), 0) 
     FROM user_sessions WHERE user_id = _user_id) as total_time_all;
$$;

-- Function to ban user (admin action)
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  _target_user_id uuid,
  _reason text,
  _banned_until timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is platform admin or higher
  IF NOT is_platform_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can ban users';
  END IF;
  
  -- Update profile status
  UPDATE public.profiles
  SET status = 'banned',
      banned_until = _banned_until,
      status_reason = _reason,
      status_updated_at = now(),
      status_updated_by = auth.uid()
  WHERE id = _target_user_id;
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, reason)
  VALUES (auth.uid(), _target_user_id, 'BAN', _reason);
END;
$$;

-- Function to unban user
CREATE OR REPLACE FUNCTION public.admin_unban_user(
  _target_user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can unban users';
  END IF;
  
  UPDATE public.profiles
  SET status = 'active',
      banned_until = NULL,
      status_reason = _reason,
      status_updated_at = now(),
      status_updated_by = auth.uid()
  WHERE id = _target_user_id;
  
  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, reason)
  VALUES (auth.uid(), _target_user_id, 'UNBAN', _reason);
END;
$$;

-- Function to remove user (soft delete)
CREATE OR REPLACE FUNCTION public.admin_remove_user(
  _target_user_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can remove users';
  END IF;
  
  IF _reason IS NULL OR char_length(_reason) < 5 THEN
    RAISE EXCEPTION 'A reason is required for removing users';
  END IF;
  
  UPDATE public.profiles
  SET status = 'removed',
      banned_until = NULL,
      status_reason = _reason,
      status_updated_at = now(),
      status_updated_by = auth.uid()
  WHERE id = _target_user_id;
  
  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, reason)
  VALUES (auth.uid(), _target_user_id, 'REMOVE', _reason);
END;
$$;

-- Function to restore user
CREATE OR REPLACE FUNCTION public.admin_restore_user(
  _target_user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can restore users';
  END IF;
  
  UPDATE public.profiles
  SET status = 'active',
      banned_until = NULL,
      status_reason = _reason,
      status_updated_at = now(),
      status_updated_by = auth.uid()
  WHERE id = _target_user_id;
  
  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, reason)
  VALUES (auth.uid(), _target_user_id, 'RESTORE', _reason);
END;
$$;