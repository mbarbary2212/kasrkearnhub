-- Case Scenarios: a core content type for exams and clinical training
-- Each case has a stem (clinical scenario) and 1-3 embedded questions

create type public.case_difficulty as enum ('easy', 'moderate', 'difficult');
create type public.case_question_type as enum ('short_answer', 'single_best_answer');

create table public.case_scenarios (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.module_chapters(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  module_id uuid references public.modules(id) on delete set null,
  difficulty case_difficulty not null default 'moderate',
  stem text not null,
  tags text[] default '{}',
  is_deleted boolean not null default false,
  display_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_scenario_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.case_scenarios(id) on delete cascade,
  question_text text not null,
  question_type case_question_type not null default 'short_answer',
  model_answer text,
  explanation text,
  max_marks int not null default 1,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_case_scenarios_chapter on public.case_scenarios(chapter_id) where not is_deleted;
create index idx_case_scenarios_topic on public.case_scenarios(topic_id) where not is_deleted;
create index idx_case_scenarios_difficulty on public.case_scenarios(difficulty) where not is_deleted;
create index idx_case_scenario_questions_case on public.case_scenario_questions(case_id);

-- Updated_at trigger
create trigger case_scenarios_updated_at
  before update on public.case_scenarios
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.case_scenarios enable row level security;
alter table public.case_scenario_questions enable row level security;

-- Read: authenticated users can read non-deleted cases
create policy "Authenticated users can read case scenarios"
  on public.case_scenarios for select to authenticated
  using (not is_deleted);

create policy "Authenticated users can read case scenario questions"
  on public.case_scenario_questions for select to authenticated
  using (true);

-- Write: admins/teachers can manage
create policy "Admins can insert case scenarios"
  on public.case_scenarios for insert to authenticated
  with check (
    public.is_platform_admin_or_higher(auth.uid())
    or public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can update case scenarios"
  on public.case_scenarios for update to authenticated
  using (
    public.is_platform_admin_or_higher(auth.uid())
    or public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can insert case scenario questions"
  on public.case_scenario_questions for insert to authenticated
  with check (
    public.is_platform_admin_or_higher(auth.uid())
    or public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can update case scenario questions"
  on public.case_scenario_questions for update to authenticated
  using (
    public.is_platform_admin_or_higher(auth.uid())
    or public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can delete case scenario questions"
  on public.case_scenario_questions for delete to authenticated
  using (
    public.is_platform_admin_or_higher(auth.uid())
    or public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'admin')
  );