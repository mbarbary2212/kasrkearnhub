-- Migration: fix RLS infinite recursion on module_admins + profiles policies

-- 1. Helper: is the caller an admin of this specific module?
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

-- 2. Helper: do caller and target share any module assignment?
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

-- 3. Helper: is the target user a topic admin in any module the caller administers?
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

-- 4. Replace recursive module_admins SELECT policy
drop policy if exists "Module admins can view peers in same module"
  on public.module_admins;

create policy "Module admins can view peers in same module"
  on public.module_admins for select to authenticated
  using (public.is_module_admin_self(auth.uid(), module_id));

-- 5. Replace recursive profiles SELECT policy (peers via module_admins)
drop policy if exists "Module admins can view profiles of their module admins"
  on public.profiles;

create policy "Module admins can view profiles of their module admins"
  on public.profiles for select to authenticated
  using (public.shares_module_admin(auth.uid(), id));

-- 6. Replace recursive profiles SELECT policy (topic admins in caller's modules)
drop policy if exists "Module admins can view topic admin profiles"
  on public.profiles;

create policy "Module admins can view topic admin profiles"
  on public.profiles for select to authenticated
  using (public.shares_module_with_topic_admin(auth.uid(), id));