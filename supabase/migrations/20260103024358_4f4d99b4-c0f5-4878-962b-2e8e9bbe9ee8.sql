-- Create mock exam settings table for admin configuration per module
CREATE TABLE public.mock_exam_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question_count INTEGER NOT NULL DEFAULT 50,
  seconds_per_question INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(module_id)
);

-- Create mock exam attempts table to track user attempts
CREATE TABLE public.mock_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  user_answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.mock_exam_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;

-- RLS for mock_exam_settings: anyone can view, only platform admins can manage
CREATE POLICY "Anyone can view mock exam settings"
ON public.mock_exam_settings
FOR SELECT
USING (true);

CREATE POLICY "Platform admins can manage mock exam settings"
ON public.mock_exam_settings
FOR ALL
USING (is_platform_admin_or_higher(auth.uid()))
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- RLS for mock_exam_attempts: users can manage their own, admins can view all
CREATE POLICY "Users can insert their own attempts"
ON public.mock_exam_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts"
ON public.mock_exam_attempts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own attempts"
ON public.mock_exam_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
ON public.mock_exam_attempts
FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_mock_exam_settings_module ON public.mock_exam_settings(module_id);
CREATE INDEX idx_mock_exam_attempts_user_module ON public.mock_exam_attempts(user_id, module_id);
CREATE INDEX idx_mock_exam_attempts_module ON public.mock_exam_attempts(module_id);

-- Create global default settings if needed (optional fallback)
CREATE TABLE public.mock_exam_global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_question_count INTEGER NOT NULL DEFAULT 50,
  default_seconds_per_question INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.mock_exam_global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global settings"
ON public.mock_exam_global_settings
FOR SELECT
USING (true);

CREATE POLICY "Platform admins can manage global settings"
ON public.mock_exam_global_settings
FOR ALL
USING (is_platform_admin_or_higher(auth.uid()))
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- Insert default global settings
INSERT INTO public.mock_exam_global_settings (default_question_count, default_seconds_per_question)
VALUES (50, 60);