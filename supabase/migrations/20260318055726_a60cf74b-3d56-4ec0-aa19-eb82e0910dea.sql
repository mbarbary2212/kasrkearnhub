
-- Table 1: Global admin pin settings
CREATE TABLE public.module_pin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.module_pin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Anyone can read pin settings"
  ON public.module_pin_settings FOR SELECT TO authenticated USING (true);
-- Only platform admins+ can modify
CREATE POLICY "Admins can manage pin settings"
  ON public.module_pin_settings FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Table 2: Per-student visibility preferences
CREATE TABLE public.student_module_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_key)
);
ALTER TABLE public.student_module_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.student_module_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed 16 module keys
INSERT INTO public.module_pin_settings (module_key) VALUES
  ('videos'),('flashcards'),('visual_resources'),('socrates'),
  ('reference_materials'),('clinical_tools'),('cases'),('pathways'),
  ('mcq'),('sba'),('true_false'),('short_answer'),
  ('osce'),('practical'),('matching'),('image_questions');
