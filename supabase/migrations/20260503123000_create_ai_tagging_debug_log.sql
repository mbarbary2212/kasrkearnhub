create table if not exists public.ai_tagging_debug_log (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid references public.lectures(id) on delete set null,
  youtube_video_id text,
  outline jsonb not null default '{}'::jsonb,
  matches jsonb not null default '{}'::jsonb,
  outline_count integer not null default 0,
  matches_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ai_tagging_debug_log_lecture_id_idx
  on public.ai_tagging_debug_log(lecture_id);

create index if not exists ai_tagging_debug_log_created_at_idx
  on public.ai_tagging_debug_log(created_at desc);

alter table public.ai_tagging_debug_log enable row level security;

create policy "Admins can read AI tagging debug logs"
  on public.ai_tagging_debug_log
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in (
          'super_admin',
          'platform_admin',
          'department_admin',
          'admin',
          'teacher'
        )
    )
  );
