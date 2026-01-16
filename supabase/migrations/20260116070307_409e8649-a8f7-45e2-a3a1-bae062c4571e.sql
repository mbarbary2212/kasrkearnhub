-- Create student readiness cache table for performance optimization
CREATE TABLE public.student_readiness_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  
  -- Readiness components
  coverage_score INTEGER NOT NULL DEFAULT 0,
  performance_score INTEGER NOT NULL DEFAULT 0,
  improvement_score INTEGER NOT NULL DEFAULT 50,
  consistency_score INTEGER NOT NULL DEFAULT 0,
  
  -- Final readiness
  exam_readiness INTEGER NOT NULL DEFAULT 0,
  cap_type TEXT, -- 'coverage', 'performance', 'improvement', or null
  raw_score INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one cache entry per user per module
  UNIQUE(user_id, module_id)
);

-- Add index for fast lookups
CREATE INDEX idx_student_readiness_cache_user_module 
  ON public.student_readiness_cache(user_id, module_id);

CREATE INDEX idx_student_readiness_cache_module 
  ON public.student_readiness_cache(module_id);

CREATE INDEX idx_student_readiness_cache_last_calculated 
  ON public.student_readiness_cache(last_calculated_at);

-- Enable RLS
ALTER TABLE public.student_readiness_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own readiness cache
CREATE POLICY "Users can view their own readiness cache"
  ON public.student_readiness_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own readiness cache
CREATE POLICY "Users can upsert their own readiness cache"
  ON public.student_readiness_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readiness cache"
  ON public.student_readiness_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all readiness caches (for admin dashboard)
CREATE POLICY "Admins can view all readiness caches"
  ON public.student_readiness_cache
  FOR SELECT
  USING (is_platform_admin_or_higher(auth.uid()));

-- Module admins can view readiness for their modules
CREATE POLICY "Module admins can view module readiness"
  ON public.student_readiness_cache
  FOR SELECT
  USING (is_module_admin(auth.uid(), module_id));

-- Create trigger for updated_at
CREATE TRIGGER update_student_readiness_cache_updated_at
  BEFORE UPDATE ON public.student_readiness_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();