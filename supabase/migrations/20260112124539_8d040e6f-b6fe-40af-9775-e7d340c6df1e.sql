-- Virtual Patient Cases table
CREATE TABLE public.virtual_patient_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  intro_text TEXT NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'intermediate' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Virtual Patient Stages table
CREATE TABLE public.virtual_patient_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.virtual_patient_cases(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'mcq' CHECK (stage_type IN ('mcq', 'multi_select', 'short_answer')),
  prompt TEXT NOT NULL,
  patient_info TEXT,
  choices JSONB DEFAULT '[]',
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  teaching_points TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_id, stage_order)
);

-- Virtual Patient Attempts table (tracks user progress)
CREATE TABLE public.virtual_patient_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.virtual_patient_cases(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER,
  total_stages INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  stage_answers JSONB NOT NULL DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.virtual_patient_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_patient_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_patient_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for virtual_patient_cases
CREATE POLICY "Anyone can view published virtual patient cases"
ON public.virtual_patient_cases
FOR SELECT
USING (is_published = true AND is_deleted = false);

CREATE POLICY "Admins can view all virtual patient cases"
ON public.virtual_patient_cases
FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can insert virtual patient cases"
ON public.virtual_patient_cases
FOR INSERT
WITH CHECK (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can update virtual patient cases"
ON public.virtual_patient_cases
FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can delete virtual patient cases"
ON public.virtual_patient_cases
FOR DELETE
USING (is_platform_admin_or_higher(auth.uid()));

-- RLS Policies for virtual_patient_stages
CREATE POLICY "Anyone can view stages of published cases"
ON public.virtual_patient_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_patient_cases
    WHERE virtual_patient_cases.id = virtual_patient_stages.case_id
    AND virtual_patient_cases.is_published = true
    AND virtual_patient_cases.is_deleted = false
  )
);

CREATE POLICY "Admins can view all stages"
ON public.virtual_patient_stages
FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can insert stages"
ON public.virtual_patient_stages
FOR INSERT
WITH CHECK (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can update stages"
ON public.virtual_patient_stages
FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

CREATE POLICY "Admins can delete stages"
ON public.virtual_patient_stages
FOR DELETE
USING (is_platform_admin_or_higher(auth.uid()));

-- RLS Policies for virtual_patient_attempts
CREATE POLICY "Users can view their own attempts"
ON public.virtual_patient_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
ON public.virtual_patient_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts"
ON public.virtual_patient_attempts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
ON public.virtual_patient_attempts
FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
  OR has_role(auth.uid(), 'topic_admin'::app_role)
);

-- Create indexes for performance
CREATE INDEX idx_virtual_patient_cases_module ON public.virtual_patient_cases(module_id);
CREATE INDEX idx_virtual_patient_cases_chapter ON public.virtual_patient_cases(chapter_id);
CREATE INDEX idx_virtual_patient_cases_published ON public.virtual_patient_cases(is_published, is_deleted);
CREATE INDEX idx_virtual_patient_stages_case ON public.virtual_patient_stages(case_id);
CREATE INDEX idx_virtual_patient_stages_order ON public.virtual_patient_stages(case_id, stage_order);
CREATE INDEX idx_virtual_patient_attempts_user ON public.virtual_patient_attempts(user_id);
CREATE INDEX idx_virtual_patient_attempts_case ON public.virtual_patient_attempts(case_id);
CREATE INDEX idx_virtual_patient_attempts_completed ON public.virtual_patient_attempts(user_id, is_completed);

-- Trigger for updated_at on cases using existing handle_updated_at function
CREATE TRIGGER update_virtual_patient_cases_updated_at
BEFORE UPDATE ON public.virtual_patient_cases
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on stages
CREATE TRIGGER update_virtual_patient_stages_updated_at
BEFORE UPDATE ON public.virtual_patient_stages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();