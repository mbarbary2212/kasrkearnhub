-- Create study_plan_baseline_items table for chapter-level baseline tracking
CREATE TABLE public.study_plan_baseline_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, chapter_id)
);

-- Enable RLS
ALTER TABLE public.study_plan_baseline_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own baseline items"
ON public.study_plan_baseline_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.study_plans sp
    WHERE sp.id = study_plan_baseline_items.plan_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own baseline items"
ON public.study_plan_baseline_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.study_plans sp
    WHERE sp.id = study_plan_baseline_items.plan_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own baseline items"
ON public.study_plan_baseline_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.study_plans sp
    WHERE sp.id = study_plan_baseline_items.plan_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own baseline items"
ON public.study_plan_baseline_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.study_plans sp
    WHERE sp.id = study_plan_baseline_items.plan_id
    AND sp.user_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_study_plan_baseline_items_plan ON public.study_plan_baseline_items(plan_id);
CREATE INDEX idx_study_plan_baseline_items_module ON public.study_plan_baseline_items(module_id);