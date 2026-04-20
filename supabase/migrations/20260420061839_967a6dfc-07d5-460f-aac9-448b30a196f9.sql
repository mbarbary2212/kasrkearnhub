-- Fix off-by-one bug in enforce_group_member_cap trigger on UPDATE branch
-- When a pending member becomes active and the group already has 10 active members,
-- the old logic (active_count > 10) allowed the 11th. Fix: use >= 10.

CREATE OR REPLACE FUNCTION public.enforce_group_member_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count integer;
  became_active boolean;
BEGIN
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

  -- FIX: For UPDATE, the row-being-updated is still stored with its OLD status (pending)
  -- and therefore NOT counted in active_count. Adding it would make it active_count+1.
  -- So reject when active_count >= 10 (meaning adding 1 would exceed the cap).
  IF active_count >= 10 THEN
    RAISE EXCEPTION 'This study group has reached its 10-member limit.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- DOWN:
-- CREATE OR REPLACE FUNCTION public.enforce_group_member_cap()
-- RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
-- DECLARE active_count integer; became_active boolean;
-- BEGIN
--   IF TG_OP = 'INSERT' THEN became_active := (NEW.status = 'active');
--   ELSIF TG_OP = 'UPDATE' THEN became_active := (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active');
--   ELSE RETURN NEW; END IF;
--   IF NOT became_active THEN RETURN NEW; END IF;
--   SELECT COUNT(*) INTO active_count FROM public.study_group_members WHERE group_id = NEW.group_id AND status = 'active';
--   IF (TG_OP = 'INSERT' AND active_count >= 10) OR (TG_OP = 'UPDATE' AND active_count > 10) THEN
--     RAISE EXCEPTION 'This study group has reached its 10-member limit.' USING ERRCODE = '23514';
--   END IF;
--   RETURN NEW;
-- END;
-- $$;