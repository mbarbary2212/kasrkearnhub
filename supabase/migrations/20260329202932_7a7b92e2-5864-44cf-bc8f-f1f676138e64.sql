
-- Exam instances table
CREATE TABLE public.exam_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessment_structures(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label TEXT,
  generation_rules JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  total_marks INTEGER NOT NULL DEFAULT 0,
  metadata JSONB
);

-- Exam instance questions table
CREATE TABLE public.exam_instance_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.exam_instances(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.assessment_components(id),
  component_type TEXT NOT NULL,
  question_id UUID NOT NULL,
  chapter_id UUID REFERENCES public.module_chapters(id),
  topic_id UUID,
  difficulty TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  marks INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exam_instances_assessment ON public.exam_instances(assessment_id);
CREATE INDEX idx_exam_instance_questions_instance ON public.exam_instance_questions(instance_id);
CREATE INDEX idx_exam_instance_questions_question ON public.exam_instance_questions(question_id);

-- RLS
ALTER TABLE public.exam_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_instance_questions ENABLE ROW LEVEL SECURITY;

-- Admins can manage exam instances
CREATE POLICY "Admins can manage exam_instances"
  ON public.exam_instances
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage exam_instance_questions"
  ON public.exam_instance_questions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));
