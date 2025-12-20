-- Add rating column to essays table
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS rating integer DEFAULT NULL;

-- Create case_scenarios table for simpler case-based learning content
CREATE TABLE public.case_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  case_history text NOT NULL,
  case_questions text NOT NULL,
  model_answer text NOT NULL,
  rating integer DEFAULT NULL,
  chapter_id uuid REFERENCES public.module_chapters(id),
  module_id uuid REFERENCES public.modules(id),
  display_order integer DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT NULL,
  updated_by uuid DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.case_scenarios ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for case_scenarios
CREATE POLICY "Anyone can view case_scenarios" 
ON public.case_scenarios 
FOR SELECT 
USING (true);

CREATE POLICY "Content managers can manage case_scenarios" 
ON public.case_scenarios 
FOR ALL 
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_manage_module_content(auth.uid(), module_id)
);

-- Create index for faster queries
CREATE INDEX idx_case_scenarios_chapter_id ON public.case_scenarios(chapter_id);
CREATE INDEX idx_case_scenarios_module_id ON public.case_scenarios(module_id);