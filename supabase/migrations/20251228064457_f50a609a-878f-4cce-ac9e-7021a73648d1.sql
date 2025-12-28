-- Add topic_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'topic_admin';

-- Create table for topic admin assignments
CREATE TABLE public.topic_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT topic_or_chapter_required CHECK (topic_id IS NOT NULL OR chapter_id IS NOT NULL),
  UNIQUE (user_id, topic_id),
  UNIQUE (user_id, chapter_id)
);

-- Enable RLS
ALTER TABLE public.topic_admins ENABLE ROW LEVEL SECURITY;

-- Topic admins can view their own assignments
CREATE POLICY "Topic admins can view their assignments"
ON public.topic_admins
FOR SELECT
USING (auth.uid() = user_id);

-- Platform admins can view all topic admins
CREATE POLICY "Platform admins can view all topic admins"
ON public.topic_admins
FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- Module admins can view topic admins in their modules
CREATE POLICY "Module admins can view topic admins in their modules"
ON public.topic_admins
FOR SELECT
USING (is_module_admin(auth.uid(), module_id));

-- Platform/Super admins can manage all topic admins
CREATE POLICY "Platform admins can manage topic admins"
ON public.topic_admins
FOR ALL
USING (is_platform_admin_or_higher(auth.uid()));

-- Module admins can manage topic admins in their modules
CREATE POLICY "Module admins can manage topic admins in their modules"
ON public.topic_admins
FOR INSERT
WITH CHECK (is_module_admin(auth.uid(), module_id));

CREATE POLICY "Module admins can delete topic admins in their modules"
ON public.topic_admins
FOR DELETE
USING (is_module_admin(auth.uid(), module_id));

-- Create function to check if user is topic admin for a specific topic
CREATE OR REPLACE FUNCTION public.is_topic_admin(_user_id UUID, _topic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topic_admins
    WHERE user_id = _user_id AND topic_id = _topic_id
  )
$$;

-- Create function to check if user is chapter admin for a specific chapter
CREATE OR REPLACE FUNCTION public.is_chapter_admin(_user_id UUID, _chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topic_admins
    WHERE user_id = _user_id AND chapter_id = _chapter_id
  )
$$;

-- Create function to check if user can manage topic content
CREATE OR REPLACE FUNCTION public.can_manage_topic_content(_user_id UUID, _topic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    is_platform_admin_or_higher(_user_id)
    OR has_role(_user_id, 'teacher')
    OR has_role(_user_id, 'admin')
    OR is_topic_admin(_user_id, _topic_id)
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = _topic_id AND is_module_admin(_user_id, t.module_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.department_admins da ON da.department_id = t.department_id
      WHERE t.id = _topic_id AND da.user_id = _user_id
    )
  )
$$;

-- Create function to check if user can manage chapter content  
CREATE OR REPLACE FUNCTION public.can_manage_chapter_content(_user_id UUID, _chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    is_platform_admin_or_higher(_user_id)
    OR has_role(_user_id, 'teacher')
    OR has_role(_user_id, 'admin')
    OR is_chapter_admin(_user_id, _chapter_id)
    OR EXISTS (
      SELECT 1 FROM public.module_chapters mc
      WHERE mc.id = _chapter_id AND is_module_admin(_user_id, mc.module_id)
    )
  )
$$;

-- Update ROLE_LABELS constant in types (we'll handle this in code)