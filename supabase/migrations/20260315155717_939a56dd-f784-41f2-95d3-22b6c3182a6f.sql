
-- TABLE 1: Live FSRS card state — one row per user+card
create table public.flashcard_states (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  card_id        uuid references public.study_resources(id) on delete cascade not null,
  due            timestamptz not null default now(),
  stability      float not null default 0,
  difficulty     float not null default 0,
  elapsed_days   integer not null default 0,
  scheduled_days integer not null default 0,
  reps           integer not null default 0,
  lapses         integer not null default 0,
  state          text not null default 'New',
  last_review    timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, card_id)
);

alter table public.flashcard_states enable row level security;

create index idx_flashcard_states_due
  on public.flashcard_states (user_id, due);

create policy "Users manage own flashcard states"
  on public.flashcard_states for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- TABLE 2: Append-only review history
create table public.flashcard_review_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  card_id        uuid references public.study_resources(id) on delete cascade not null,
  rating         text not null,
  scheduled_days integer not null,
  elapsed_days   integer not null,
  reviewed_at    timestamptz not null default now()
);

alter table public.flashcard_review_logs enable row level security;

create policy "Users manage own review logs"
  on public.flashcard_review_logs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
