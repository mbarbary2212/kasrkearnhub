-- Public RPC: return name + avatar for team credit members by their stored emails.
-- Safe to expose since team_credits is already publicly readable for active members.
create or replace function public.get_team_credit_profiles()
returns table (email text, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(trim(p.email)) as email, p.full_name, p.avatar_url
  from public.profiles p
  where lower(trim(p.email)) in (
    select lower(trim(tc.email))
    from public.team_credits tc
    where tc.email is not null and tc.is_active = true
  );
$$;

grant execute on function public.get_team_credit_profiles() to anon, authenticated;