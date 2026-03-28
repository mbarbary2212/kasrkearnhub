
-- Assessment type enum
CREATE TYPE public.assessment_type AS ENUM (
  'formative',
  'final_written',
  'final_practical',
  'module_exam'
);

-- Component type enum
CREATE TYPE public.exam_component_type AS ENUM (
  'mcq',
  'short_answer_recall',
  'short_answer_case',
  'osce',
  'long_case',
  'short_case',
  'paraclinical'
);

-- Assessment structures: defines an assessment for a module in a year
CREATE TABLE public.assessment_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  assessment_type public.assessment_type NOT NULL,
  name TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, assessment_type)
);

-- Components within each assessment
CREATE TABLE public.assessment_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  component_type public.exam_component_type NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  marks_per_question NUMERIC(6,2) NOT NULL DEFAULT 1,
  total_marks NUMERIC(8,2) GENERATED ALWAYS AS (question_count * marks_per_question) STORED,
  duration_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, component_type)
);

-- Topic/chapter exam weights
CREATE TABLE public.topic_exam_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  component_id UUID REFERENCES public.assessment_components(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  weight_marks NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_assessment_structures_module ON public.assessment_structures(module_id);
CREATE INDEX idx_assessment_structures_year ON public.assessment_structures(year_id);
CREATE INDEX idx_assessment_components_assessment ON public.assessment_components(assessment_id);
CREATE INDEX idx_topic_exam_weights_assessment ON public.topic_exam_weights(assessment_id);
CREATE INDEX idx_topic_exam_weights_chapter ON public.topic_exam_weights(chapter_id);
CREATE INDEX idx_topic_exam_weights_module ON public.topic_exam_weights(module_id);

-- Updated_at triggers
CREATE TRIGGER set_assessment_structures_updated_at
  BEFORE UPDATE ON public.assessment_structures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_topic_exam_weights_updated_at
  BEFORE UPDATE ON public.topic_exam_weights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.assessment_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_exam_weights ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read
CREATE POLICY "Authenticated users can read assessment_structures"
  ON public.assessment_structures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read assessment_components"
  ON public.assessment_components FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read topic_exam_weights"
  ON public.topic_exam_weights FOR SELECT TO authenticated
  USING (true);

-- Write: platform admin or higher
CREATE POLICY "Platform admins can manage assessment_structures"
  ON public.assessment_structures FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Platform admins can manage assessment_components"
  ON public.assessment_components FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Platform admins can manage topic_exam_weights"
  ON public.topic_exam_weights FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Also allow module admins to manage their own module's data
CREATE POLICY "Module admins can manage own assessment_structures"
  ON public.assessment_structures FOR ALL TO authenticated
  USING (public.is_module_admin(auth.uid(), module_id))
  WITH CHECK (public.is_module_admin(auth.uid(), module_id));

CREATE POLICY "Module admins can manage own assessment_components"
  ON public.assessment_components FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_structures s
    WHERE s.id = assessment_components.assessment_id
    AND public.is_module_admin(auth.uid(), s.module_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessment_structures s
    WHERE s.id = assessment_components.assessment_id
    AND public.is_module_admin(auth.uid(), s.module_id)
  ));

CREATE POLICY "Module admins can manage own topic_exam_weights"
  ON public.topic_exam_weights FOR ALL TO authenticated
  USING (public.is_module_admin(auth.uid(), module_id))
  WITH CHECK (public.is_module_admin(auth.uid(), module_id));
