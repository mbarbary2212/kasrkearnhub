-- 1a. Rate-limit table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  bucket_minute timestamptz NOT NULL,
  call_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, bucket_minute)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No student-facing policies needed — only SECURITY DEFINER functions write here.

-- 1b. Search RPC
CREATE OR REPLACE FUNCTION public.search_invitable_users(
  search_term text,
  group_id uuid
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  current_bucket timestamptz := date_trunc('minute', now());
  current_count integer;
  group_active_count integer;
BEGIN
  -- Must be authenticated
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Banned users get empty results (don't leak ban state via exception)
  IF public.is_user_banned(caller) THEN
    RETURN;
  END IF;

  -- Caller must be a member of the group (prevents scraping via arbitrary group ids)
  IF NOT public.is_group_member(caller, search_invitable_users.group_id) THEN
    RAISE EXCEPTION 'You are not a member of this group' USING ERRCODE = '42501';
  END IF;

  -- Minimum search length to prevent enumeration
  IF length(trim(search_term)) < 2 THEN
    RETURN;
  END IF;

  -- Rate limit: 20 calls per minute per user
  INSERT INTO public.rate_limits (user_id, endpoint, bucket_minute, call_count)
  VALUES (caller, 'search_invitable_users', current_bucket, 1)
  ON CONFLICT (user_id, endpoint, bucket_minute)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO current_count;

  IF current_count > 20 THEN
    RAISE EXCEPTION 'Too many searches. Please wait a minute and try again.' USING ERRCODE = '54000';
  END IF;

  -- Check if group is already full (at 10)
  SELECT COUNT(*) INTO group_active_count
  FROM public.study_group_members
  WHERE study_group_members.group_id = search_invitable_users.group_id
    AND status = 'active';

  IF group_active_count >= 10 THEN
    RAISE EXCEPTION 'This study group is full (10 members maximum).' USING ERRCODE = '23514';
  END IF;

  -- Return matches: by full_name only (NOT email, NOT any other field)
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.status = 'active'
    AND p.id != caller
    AND p.full_name ILIKE '%' || search_term || '%'
    AND NOT EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = search_invitable_users.group_id
        AND m.user_id = p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.study_group_invites i
      WHERE i.group_id = search_invitable_users.group_id
        AND i.invited_user_id = p.id
        AND i.status = 'pending'
    )
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_invitable_users(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.search_invitable_users(text, uuid) TO authenticated;

-- 1c. 10-member group cap trigger
CREATE OR REPLACE FUNCTION public.enforce_group_member_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count integer;
  became_active boolean;
BEGIN
  -- Only enforce when a row becomes active (newly inserted as active, or status updated to active)
  IF TG_OP = 'INSERT' THEN
    became_active := (NEW.status = 'active');
  ELSIF TG_OP = 'UPDATE' THEN
    became_active := (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active');
  ELSE
    RETURN NEW;
  END IF;

  IF NOT became_active THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.study_group_members
  WHERE group_id = NEW.group_id AND status = 'active';

  -- For UPDATE: the old 'active' row is still counted; for INSERT it wasn't counted yet
  IF (TG_OP = 'INSERT' AND active_count >= 10)
     OR (TG_OP = 'UPDATE' AND active_count > 10) THEN
    RAISE EXCEPTION 'This study group has reached its 10-member limit.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_group_members_cap ON public.study_group_members;
CREATE TRIGGER study_group_members_cap
  BEFORE INSERT OR UPDATE ON public.study_group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_cap();

-- 1d. Recommended cleanup (commented for ops setup):
-- SELECT cron.schedule('cleanup-rate-limits', '0 3 * * *', $$DELETE FROM public.rate_limits WHERE bucket_minute < now() - interval '1 day'$$);

-- DOWN:
-- DROP TRIGGER IF EXISTS study_group_members_cap ON public.study_group_members;
-- DROP FUNCTION IF EXISTS public.enforce_group_member_cap();
-- DROP FUNCTION IF EXISTS public.search_invitable_users(text, uuid);
-- DROP TABLE IF EXISTS public.rate_limits;