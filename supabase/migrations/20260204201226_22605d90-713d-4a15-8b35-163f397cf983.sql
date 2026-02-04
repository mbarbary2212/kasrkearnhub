-- =============================================
-- TRUE/FALSE QUESTIONS TABLE
-- =============================================
CREATE TABLE public.true_false_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  contributing_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  statement TEXT NOT NULL,
  correct_answer BOOLEAN NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  display_order INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tf_module ON public.true_false_questions(module_id);
CREATE INDEX idx_tf_chapter ON public.true_false_questions(chapter_id);
CREATE INDEX idx_tf_section ON public.true_false_questions(section_id);
CREATE INDEX idx_tf_topic ON public.true_false_questions(topic_id);
CREATE INDEX idx_tf_not_deleted ON public.true_false_questions(is_deleted) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE public.true_false_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching MCQ pattern)
CREATE POLICY "Students can read non-deleted true_false questions"
  ON public.true_false_questions FOR SELECT
  USING (NOT is_deleted);

CREATE POLICY "Module admins can insert true_false questions"
  ON public.true_false_questions FOR INSERT
  WITH CHECK (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_module_admin(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND public.is_chapter_admin(auth.uid(), chapter_id))
  );

CREATE POLICY "Module admins can update true_false questions"
  ON public.true_false_questions FOR UPDATE
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_module_admin(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND public.is_chapter_admin(auth.uid(), chapter_id))
  );

CREATE POLICY "Module admins can delete true_false questions"
  ON public.true_false_questions FOR DELETE
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.is_module_admin(auth.uid(), module_id)
  );

-- =============================================
-- TRUE/FALSE ANALYTICS TABLE (for future use)
-- =============================================
CREATE TABLE public.tf_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tf_id UUID NOT NULL REFERENCES public.true_false_questions(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  facility_index NUMERIC(5,4),
  is_flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[],
  flag_severity TEXT CHECK (flag_severity IN ('low', 'medium', 'high', 'critical')),
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX idx_tf_analytics_tf_id ON public.tf_analytics(tf_id);
CREATE INDEX idx_tf_analytics_module ON public.tf_analytics(module_id);
CREATE INDEX idx_tf_analytics_flagged ON public.tf_analytics(is_flagged) WHERE is_flagged = true;

-- Enable RLS
ALTER TABLE public.tf_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics (admin-only read/write)
CREATE POLICY "Admins can read tf_analytics"
  ON public.tf_analytics FOR SELECT
  USING (
    public.is_platform_admin_or_higher(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_module_admin(auth.uid(), module_id)
  );

CREATE POLICY "Platform admins can manage tf_analytics"
  ON public.tf_analytics FOR ALL
  USING (public.is_platform_admin_or_higher(auth.uid()));