-- Add updated_by and is_deleted columns to content tables
ALTER TABLE public.lectures 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.resources 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.mcq_sets 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.practicals 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.essays 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.clinical_cases 
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Create item_feedback table for content-specific feedback
CREATE TABLE IF NOT EXISTS public.item_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('video', 'resource', 'mcq', 'practical', 'shortq', 'case')),
  item_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  category text NOT NULL CHECK (category IN ('content_quality', 'technical_issue', 'suggestion', 'error', 'other')),
  message text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT true,
  is_flagged boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inquiries table for general contact
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('general', 'technical', 'content', 'account', 'suggestion', 'other')),
  subject text NOT NULL,
  message text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_feedback_module_id ON public.item_feedback(module_id);
CREATE INDEX IF NOT EXISTS idx_item_feedback_item_type ON public.item_feedback(item_type);
CREATE INDEX IF NOT EXISTS idx_item_feedback_status ON public.item_feedback(status);
CREATE INDEX IF NOT EXISTS idx_item_feedback_is_flagged ON public.item_feedback(is_flagged);
CREATE INDEX IF NOT EXISTS idx_inquiries_module_id ON public.inquiries(module_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_lectures_is_deleted ON public.lectures(is_deleted);
CREATE INDEX IF NOT EXISTS idx_resources_is_deleted ON public.resources(is_deleted);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_is_deleted ON public.mcq_sets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_practicals_is_deleted ON public.practicals(is_deleted);
CREATE INDEX IF NOT EXISTS idx_essays_is_deleted ON public.essays(is_deleted);

-- Enable RLS
ALTER TABLE public.item_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- RLS policies for item_feedback

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.item_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.item_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Module admins can view feedback for their modules
CREATE POLICY "Module admins can view module feedback"
ON public.item_feedback FOR SELECT
USING (
  is_module_admin(auth.uid(), module_id)
  OR is_platform_admin_or_higher(auth.uid())
);

-- Module admins can update feedback for their modules
CREATE POLICY "Module admins can update module feedback"
ON public.item_feedback FOR UPDATE
USING (
  is_module_admin(auth.uid(), module_id)
  OR is_platform_admin_or_higher(auth.uid())
);

-- Super admins can view all flagged feedback
CREATE POLICY "Super admins can view all feedback"
ON public.item_feedback FOR SELECT
USING (is_super_admin(auth.uid()));

-- RLS policies for inquiries

-- Users can insert their own inquiries
CREATE POLICY "Users can insert their own inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own inquiries
CREATE POLICY "Users can view their own inquiries"
ON public.inquiries FOR SELECT
USING (auth.uid() = user_id);

-- Module admins can view inquiries for their modules
CREATE POLICY "Module admins can view module inquiries"
ON public.inquiries FOR SELECT
USING (
  (module_id IS NOT NULL AND is_module_admin(auth.uid(), module_id))
  OR is_platform_admin_or_higher(auth.uid())
);

-- Module admins can update inquiries for their modules
CREATE POLICY "Module admins can update module inquiries"
ON public.inquiries FOR UPDATE
USING (
  (module_id IS NOT NULL AND is_module_admin(auth.uid(), module_id))
  OR is_platform_admin_or_higher(auth.uid())
);

-- Super admins can view all inquiries
CREATE POLICY "Super admins can view all inquiries"
ON public.inquiries FOR SELECT
USING (is_super_admin(auth.uid()));