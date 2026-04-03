
-- 1. study_time_events: heartbeat-based time accumulator
CREATE TABLE public.study_time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('reading','watching','practicing','cases')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_time_user_chapter_date ON public.study_time_events(user_id, chapter_id, session_date);
CREATE INDEX idx_study_time_user_date ON public.study_time_events(user_id, session_date);

ALTER TABLE public.study_time_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study time events"
  ON public.study_time_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study time events"
  ON public.study_time_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study time events"
  ON public.study_time_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. daily_study_plans: persisted daily plan outputs
CREATE TABLE public.daily_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_mode TEXT DEFAULT 'normal' CHECK (exam_mode IN ('normal','moderate','intensive')),
  plan_label TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date, module_id)
);

CREATE INDEX idx_daily_plans_user_date ON public.daily_study_plans(user_id, plan_date);

ALTER TABLE public.daily_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily plans"
  ON public.daily_study_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily plans"
  ON public.daily_study_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily plans"
  ON public.daily_study_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily plans"
  ON public.daily_study_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. daily_study_plan_tasks: individual tasks within a daily plan
CREATE TABLE public.daily_study_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.daily_study_plans(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','completed','skipped')),
  is_carried_over BOOLEAN NOT NULL DEFAULT false,
  carry_count INTEGER NOT NULL DEFAULT 0,
  priority NUMERIC NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 15,
  completion_percent INTEGER DEFAULT 0,
  prescribed_study_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_tasks_plan ON public.daily_study_plan_tasks(plan_id);
CREATE INDEX idx_daily_tasks_status ON public.daily_study_plan_tasks(status);

ALTER TABLE public.daily_study_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily plan tasks"
  ON public.daily_study_plan_tasks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_study_plans dsp
    WHERE dsp.id = plan_id AND dsp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own daily plan tasks"
  ON public.daily_study_plan_tasks FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_study_plans dsp
    WHERE dsp.id = plan_id AND dsp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own daily plan tasks"
  ON public.daily_study_plan_tasks FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_study_plans dsp
    WHERE dsp.id = plan_id AND dsp.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own daily plan tasks"
  ON public.daily_study_plan_tasks FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_study_plans dsp
    WHERE dsp.id = plan_id AND dsp.user_id = auth.uid()
  ));

-- Trigger for updated_at on daily_study_plan_tasks
CREATE TRIGGER update_daily_plan_tasks_updated_at
  BEFORE UPDATE ON public.daily_study_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Add exam_date to study_plans (configuration source)
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS exam_date DATE;
