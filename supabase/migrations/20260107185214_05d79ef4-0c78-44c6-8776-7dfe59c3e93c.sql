-- MCQ Psychometric Analytics Tables

-- Create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table to store calculated analytics for each MCQ
CREATE TABLE public.mcq_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mcq_id UUID NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  
  -- Core metrics
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  facility_index DECIMAL(4,3) CHECK (facility_index >= 0 AND facility_index <= 1),
  discrimination_index DECIMAL(4,3) CHECK (discrimination_index >= -1 AND discrimination_index <= 1),
  
  -- Distractor analysis: {"A": 15, "B": 42, "C": 8, "D": 12, "E": 3}
  distractor_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Time metrics
  avg_time_seconds INTEGER,
  min_time_seconds INTEGER,
  max_time_seconds INTEGER,
  
  -- Flagging system
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reasons TEXT[] DEFAULT '{}',
  flag_severity TEXT CHECK (flag_severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Tracking
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one analytics record per MCQ
  UNIQUE(mcq_id)
);

-- Table to store generated reports for module admins
CREATE TABLE public.mcq_analytics_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  generated_for UUID NOT NULL,
  
  -- Report content
  report_type TEXT NOT NULL DEFAULT 'weekly' CHECK (report_type IN ('weekly', 'monthly', 'on_demand')),
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Summary stats at time of generation
  total_mcqs INTEGER NOT NULL DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  avg_facility_index DECIMAL(4,3),
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  
  -- Tracking
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mcq_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_analytics_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcq_analytics

-- Anyone can view analytics (students might see aggregate stats)
CREATE POLICY "Anyone can view mcq_analytics"
ON public.mcq_analytics
FOR SELECT
USING (true);

-- Only platform admins or module admins can manage analytics
CREATE POLICY "Admins can manage mcq_analytics"
ON public.mcq_analytics
FOR ALL
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR is_module_admin(auth.uid(), module_id)
);

-- RLS Policies for mcq_analytics_reports

-- Users can view reports generated for them
CREATE POLICY "Users can view their own reports"
ON public.mcq_analytics_reports
FOR SELECT
USING (
  generated_for = auth.uid()
  OR is_platform_admin_or_higher(auth.uid())
  OR is_module_admin(auth.uid(), module_id)
);

-- Users can update their own reports (mark as read)
CREATE POLICY "Users can update their own reports"
ON public.mcq_analytics_reports
FOR UPDATE
USING (generated_for = auth.uid());

-- Platform admins and system can insert reports
CREATE POLICY "System can insert reports"
ON public.mcq_analytics_reports
FOR INSERT
WITH CHECK (
  is_platform_admin_or_higher(auth.uid())
  OR is_module_admin(auth.uid(), module_id)
);

-- Create indexes for performance
CREATE INDEX idx_mcq_analytics_module ON public.mcq_analytics(module_id);
CREATE INDEX idx_mcq_analytics_chapter ON public.mcq_analytics(chapter_id);
CREATE INDEX idx_mcq_analytics_flagged ON public.mcq_analytics(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_mcq_analytics_facility ON public.mcq_analytics(facility_index);
CREATE INDEX idx_mcq_analytics_reports_module ON public.mcq_analytics_reports(module_id);
CREATE INDEX idx_mcq_analytics_reports_user ON public.mcq_analytics_reports(generated_for);

-- Trigger to update updated_at
CREATE TRIGGER update_mcq_analytics_updated_at
BEFORE UPDATE ON public.mcq_analytics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();