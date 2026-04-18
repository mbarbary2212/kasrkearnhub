
## Final migration SQL — for review only, do not apply

Scan result (Step 1):
- `module_admins`: 1 recursive policy → fix included
- `profiles`: 2 recursive policies → fixes included (one was missed in earlier plan)
- `topic_admins`, `user_roles`, `department_admins`: clean, no fix needed

Refinements applied: `pg_temp` in search_path, `drop policy if exists`, locked-down `execute` grants.

```sql
-- Migration: fix RLS infinite recursion on module_admins + profiles policies
--
-- Scan of public.user_roles, department_admins, topic_admins, module_admins, profiles:
--   - module_admins: 1 self-referencing SELECT policy ("Module admins can view peers in same module")
--   - profiles: 2 self-referencing SELECT policies via module_admins joins
--       ("Module admins can view profiles of their module admins",
--        "Module admins can view topic admin profiles")
--   - topic_admins, user_roles, department_admins: clean — already use SECURITY DEFINER helpers,
--     no changes required.

-- =========================================================================
-- 1. Helper: is the caller an admin of this specific module?
-- =========================================================================
create or replace function public.is_module_admin_self(_user_id uuid, _module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.module_admins
    where user_id = _user_id and module_id = _module_id
  )
$$;

revoke execute on function public.is_module_admin_self(uuid, uuid) from public;
grant  execute on function public.is_module_admin_self(uuid, uuid) to authenticated;

-- Note: a public.is_module_admin(uuid, uuid) already exists and is identical in body.
-- We intentionally introduce is_module_admin_self to make it 100% explicit that this
-- function is the one used by the recursive-fix policies, and to avoid any chance of
-- a future edit to is_module_admin reintroducing recursion. Both can coexist safely.

-- =========================================================================
-- 2. Helper: do caller and target share any module assignment?
-- =========================================================================
create or replace function public.shares_module_admin(_caller uuid, _target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.module_admins a
    join public.module_admins b on a.module_id = b.module_id
    where a.user_id = _caller and b.user_id = _target
  )
$$;

revoke execute on function public.shares_module_admin(uuid, uuid) from public;
grant  execute on function public.shares_module_admin(uuid, uuid) to authenticated;

-- =========================================================================
-- 3. Helper: is the target user a topic admin in any module the caller administers?
-- =========================================================================
create or replace function public.shares_module_with_topic_admin(_caller uuid, _target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.module_admins ma
    join public.topic_admins ta on ta.module_id = ma.module_id
    where ma.user_id = _caller
      and ta.user_id = _target
  )
$$;

revoke execute on function public.shares_module_with_topic_admin(uuid, uuid) from public;
grant  execute on function public.shares_module_with_topic_admin(uuid, uuid) to authenticated;

-- =========================================================================
-- 4. Replace recursive module_admins SELECT policy
-- =========================================================================
drop policy if exists "Module admins can view peers in same module"
  on public.module_admins;

create policy "Module admins can view peers in same module"
  on public.module_admins for select to authenticated
  using (public.is_module_admin_self(auth.uid(), module_id));

-- =========================================================================
-- 5. Replace recursive profiles SELECT policy (peers via module_admins)
-- =========================================================================
drop policy if exists "Module admins can view profiles of their module admins"
  on public.profiles;

create policy "Module admins can view profiles of their module admins"
  on public.profiles for select to authenticated
  using (public.shares_module_admin(auth.uid(), id));

-- =========================================================================
-- 6. Replace recursive profiles SELECT policy (topic admins in caller's modules)
-- =========================================================================
drop policy if exists "Module admins can view topic admin profiles"
  on public.profiles;

create policy "Module admins can view topic admin profiles"
  on public.profiles for select to authenticated
  using (public.shares_module_with_topic_admin(auth.uid(), id));
```

### What this changes
- 3 new `SECURITY DEFINER` helpers, hardened search_path, execute restricted to `authenticated`.
- 3 RLS policies dropped (idempotently) and recreated with helper calls — no behavior change for end users; module admins still see exactly the same peers, profiles, and topic-admin profiles they could see before (when the policies actually worked).
- No app code, no schema, no other tables touched.

### Acceptance check after apply
1. `/admin?tab=users` as super admin → "Failed to load users" red card disappears, Directory populates.
2. Module Admins / Topic Admins assignment dialogs return user search results.
3. Non-admin module admin still only sees peers + topic admins in their own modules.
4. Inbox and other admin tabs continue to load fast.

Awaiting your explicit "apply" before submitting this as a migration.
