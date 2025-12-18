-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Create flashcard_settings table for editable disclaimer
CREATE TABLE public.flashcard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default disclaimer
INSERT INTO public.flashcard_settings (key, value)
VALUES ('disclaimer', 'These flashcards are NOT a replacement for the textbook or lectures. They are designed to help revision, memorization, and quick recall for study and exams.');

-- Enable RLS on flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Anyone can view flashcards (students view-only)
CREATE POLICY "Anyone can view flashcards"
ON public.flashcards
FOR SELECT
USING (is_deleted = false);

-- Admin/Super Admin can manage flashcards
CREATE POLICY "Admins can manage flashcards"
ON public.flashcards
FOR ALL
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Enable RLS on flashcard_settings
ALTER TABLE public.flashcard_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view flashcard_settings"
ON public.flashcard_settings
FOR SELECT
USING (true);

-- Only super admins can update settings
CREATE POLICY "Super admins can manage flashcard_settings"
ON public.flashcard_settings
FOR ALL
USING (is_super_admin(auth.uid()));