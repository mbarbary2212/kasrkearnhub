create table public.scheduled_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id uuid references public.study_resources(id) on delete cascade not null,
  due_date date not null,
  interval_label text not null check (interval_label in ('1 day', '1 week', '1 month')),
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.scheduled_reviews enable row level security;

create index idx_scheduled_reviews_user_due
  on public.scheduled_reviews (user_id, due_date, is_completed);

create unique index idx_scheduled_reviews_unique
  on public.scheduled_reviews (user_id, card_id, interval_label);

create policy "Users manage own scheduled reviews"
  on public.scheduled_reviews for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());