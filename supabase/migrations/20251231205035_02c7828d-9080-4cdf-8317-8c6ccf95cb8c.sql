-- Create study_plans table for storing year-level study plans
CREATE TABLE public.study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_per_week INTEGER NOT NULL CHECK (days_per_week >= 1 AND days_per_week <= 7),
  hours_per_day NUMERIC(4,2) NOT NULL CHECK (hours_per_day >= 0.5 AND hours_per_day <= 12),
  revision_rounds INTEGER NOT NULL DEFAULT 2 CHECK (revision_rounds >= 1 AND revision_rounds <= 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year_id)
);

-- Create study_plan_baseline table for module baseline progress
CREATE TABLE public.study_plan_baseline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  baseline_completed_percent INTEGER NOT NULL DEFAULT 0 CHECK (baseline_completed_percent >= 0 AND baseline_completed_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, module_id)
);

-- Create study_plan_items table for chapter/section schedule
CREATE TABLE public.study_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'chapter' CHECK (item_type IN ('chapter', 'revision', 'final_revision')),
  week_index INTEGER NOT NULL,
  planned_date_from DATE NOT NULL,
  planned_date_to DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done')),
  completed_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_plans
CREATE POLICY "Users can view their own study plans"
ON public.study_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans"
ON public.study_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
ON public.study_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
ON public.study_plans FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for study_plan_baseline
CREATE POLICY "Users can view their own baselines"
ON public.study_plan_baseline FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_baseline.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own baselines"
ON public.study_plan_baseline FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_baseline.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can update their own baselines"
ON public.study_plan_baseline FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_baseline.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own baselines"
ON public.study_plan_baseline FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_baseline.plan_id AND sp.user_id = auth.uid()
));

-- RLS policies for study_plan_items
CREATE POLICY "Users can view their own plan items"
ON public.study_plan_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_items.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own plan items"
ON public.study_plan_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_items.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can update their own plan items"
ON public.study_plan_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_items.plan_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own plan items"
ON public.study_plan_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.study_plans sp 
  WHERE sp.id = study_plan_items.plan_id AND sp.user_id = auth.uid()
));

-- Trigger for updated_at on study_plans
CREATE TRIGGER update_study_plans_updated_at
BEFORE UPDATE ON public.study_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger for updated_at on study_plan_items
CREATE TRIGGER update_study_plan_items_updated_at
BEFORE UPDATE ON public.study_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_study_plans_user_year ON public.study_plans(user_id, year_id);
CREATE INDEX idx_study_plan_items_plan_module ON public.study_plan_items(plan_id, module_id);
CREATE INDEX idx_study_plan_items_week ON public.study_plan_items(plan_id, week_index);