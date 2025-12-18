-- Create difficulty enum
CREATE TYPE public.mcq_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Create new mcqs table for individual questions (not sets)
CREATE TABLE public.mcqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid NULL REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  stem text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_key text NOT NULL,
  explanation text NULL,
  difficulty public.mcq_difficulty NULL DEFAULT 'medium',
  display_order integer DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraint to ensure correct_key is A-E
ALTER TABLE public.mcqs ADD CONSTRAINT mcqs_correct_key_check 
  CHECK (correct_key IN ('A', 'B', 'C', 'D', 'E'));

-- Add constraint to ensure choices has exactly 5 items
ALTER TABLE public.mcqs ADD CONSTRAINT mcqs_choices_count_check 
  CHECK (jsonb_array_length(choices) = 5);

-- Enable RLS
ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view mcqs (students can SELECT)
CREATE POLICY "Anyone can view mcqs" ON public.mcqs 
  FOR SELECT USING (true);

-- Policy: Admins and teachers can manage mcqs (INSERT/UPDATE/DELETE)
CREATE POLICY "Content managers can manage mcqs" ON public.mcqs 
  FOR ALL USING (
    is_platform_admin_or_higher(auth.uid()) 
    OR has_role(auth.uid(), 'teacher'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index for faster queries
CREATE INDEX idx_mcqs_module_id ON public.mcqs(module_id);
CREATE INDEX idx_mcqs_chapter_id ON public.mcqs(chapter_id);