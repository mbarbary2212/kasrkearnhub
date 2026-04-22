-- Extend search_invitable_users to also match email local-part (prefix before @)
-- so students searching by nicknames/handles like "salma_amr" can find colleagues
-- whose registered full_name doesn't exactly match. Email itself is NEVER returned.

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
  term text := trim(search_term);
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF public.is_user_banned(caller) THEN
    RETURN;
  END IF;

  IF NOT public.is_group_member(caller, search_invitable_users.group_id) THEN
    RAISE EXCEPTION 'You are not a member of this group' USING ERRCODE = '42501';
  END IF;

  IF length(term) < 2 THEN
    RETURN;
  END IF;

  INSERT INTO public.rate_limits (user_id, endpoint, bucket_minute, call_count)
  VALUES (caller, 'search_invitable_users', current_bucket, 1)
  ON CONFLICT (user_id, endpoint, bucket_minute)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO current_count;

  IF current_count > 20 THEN
    RAISE EXCEPTION 'Too many searches. Please wait a minute and try again.' USING ERRCODE = '54000';
  END IF;

  SELECT COUNT(*) INTO group_active_count
  FROM public.study_group_members
  WHERE study_group_members.group_id = search_invitable_users.group_id
    AND status = 'active';

  IF group_active_count >= 10 THEN
    RAISE EXCEPTION 'This study group is full (10 members maximum).' USING ERRCODE = '23514';
  END IF;

  -- Match either full_name OR the local-part of the email (text before '@').
  -- Email value itself is never returned in the result set.
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.status = 'active'
    AND p.id != caller
    AND (
      p.full_name ILIKE '%' || term || '%'
      OR split_part(COALESCE(p.email, ''), '@', 1) ILIKE '%' || term || '%'
    )
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