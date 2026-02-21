
-- ============================================
-- AI GOVERNANCE: 4 new tables
-- ============================================

-- A) ai_rules: Versioned, scoped AI generation rules
CREATE TABLE public.ai_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global', 'module', 'chapter')),
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  instructions text NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes text
);

-- Partial unique index: only ONE active rule per (scope, module_id, chapter_id, content_type)
CREATE UNIQUE INDEX idx_ai_rules_active_unique
  ON public.ai_rules (scope, COALESCE(module_id, '00000000-0000-0000-0000-000000000000'), COALESCE(chapter_id, '00000000-0000-0000-0000-000000000000'), content_type)
  WHERE is_active = true;

CREATE INDEX idx_ai_rules_content_type ON public.ai_rules (content_type, is_active);

ALTER TABLE public.ai_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai_rules"
  ON public.ai_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins+ can insert ai_rules"
  ON public.ai_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Platform admins+ can update ai_rules"
  ON public.ai_rules FOR UPDATE TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Super admins can delete ai_rules"
  ON public.ai_rules FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Seed global rules with current NBME guidelines
INSERT INTO public.ai_rules (scope, content_type, instructions, version, is_active, notes) VALUES
('global', 'mcq', E'PEDAGOGICAL GUIDELINES (NBME Item-Writing Standards):\n- Use ONE-BEST-ANSWER format with clinical vignette stems when appropriate\n- Provide exactly 5 options (A-E): one correct answer, four plausible distractors\n- Difficulty distribution across the set: ~30% easy, ~50% moderate, ~20% hard\n- Lead-in must be CLOSED and FOCUSED: a knowledgeable student should be able to guess the answer WITHOUT seeing options ("cover-the-options" rule)\n- All options must be HOMOGENEOUS (same category), PARALLEL in grammatical structure, and SIMILAR in length\n- Distractors must be plausible but clearly incorrect on a single discriminating dimension\n- Vary the position of the correct answer across the set (do NOT always put it in position A or E)\n- Include clear, educational explanations for each question\n\nSTRICT AVOID LIST (NBME Technical Item Flaws):\n- "None of the above" or "All of the above" as options\n- Absolute terms ("always", "never") in options\n- Negatively phrased stems ("Which is NOT...", "All EXCEPT...")\n- Grammatical cues between stem and correct answer\n- Word repetition / clang clues\n- Vague frequency terms in options\n- Collectively exhaustive option subsets\n- Correct option being noticeably longer than distractors', 1, true, 'Initial NBME guidelines'),

('global', 'essay', E'PEDAGOGICAL GUIDELINES (Written Exam Standards):\n- Use Bloom''s taxonomy action verbs appropriate to the cognitive level tested\n- Include a comprehensive model answer with possible alternative acceptable answers\n- Specify the key concepts that must be covered\n- Allocate marks/keywords by importance and time needed\n- Ensure the question tests understanding, not just recall', 1, true, 'Initial essay guidelines'),

('global', 'osce', E'PEDAGOGICAL GUIDELINES (Clinical Assessment Standards):\n- Each statement must be ABSOLUTELY true or false with no ambiguity\n- Ensure a MIX of true and false answers across the 5 statements\n- Statements should test different aspects of the clinical scenario\n- AVOID vague terms: "associated with", "usually", "frequently", "can sometimes"\n- Each explanation must clearly justify why the statement is true or false', 1, true, 'Initial OSCE guidelines'),

('global', 'matching', E'PEDAGOGICAL GUIDELINES (EMQ Standards):\n- Include a clear theme and task instruction\n- Provide at least 6 options in each column to reduce guessing probability\n- Options should be HOMOGENEOUS and PARALLEL in structure\n- Each option should be plausible for multiple stems\n- Avoid giving away answers through option ordering', 1, true, 'Initial matching guidelines'),

('global', 'flashcard', E'PEDAGOGICAL GUIDELINES:\n- Use Bloom''s taxonomy for question formulation\n- Vary difficulty across the set\n- Front should be a clear, focused question or prompt\n- Back should be concise but complete', 1, true, 'Initial flashcard guidelines'),

('global', 'guided_explanation', E'PEDAGOGICAL GUIDELINES (Socratic Method):\n- Questions should scaffold from foundational to complex reasoning\n- Each question should build on the previous answer\n- Hints should guide without giving away the answer\n- Rubric concepts must be specific and assessable\n- Summary should synthesize all guided discoveries', 1, true, 'Initial guided explanation guidelines'),

('global', 'clinical_case', E'PEDAGOGICAL GUIDELINES:\n- Cases should present realistic clinical scenarios\n- Include progressive disclosure of information across stages\n- Mix stage types (mcq, multi_select, short_answer) for engagement\n- Teaching points should reinforce clinical reasoning\n- Difficulty should match the specified level', 1, true, 'Initial clinical case guidelines');


-- B) admin_api_keys: Per-admin BYOK API keys
CREATE TABLE public.admin_api_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gemini',
  api_key_encrypted text NOT NULL,
  key_hint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.admin_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own key metadata (NOT the encrypted key)
CREATE POLICY "Users can read own api key metadata"
  ON public.admin_api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only edge functions (service role) can insert/update encrypted keys
-- No insert/update policies for authenticated users - managed via edge function


-- C) ai_platform_settings: Superadmin-only global AI controls
CREATE TABLE public.ai_platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_superadmin_global_ai boolean NOT NULL DEFAULT true,
  allow_admin_fallback_to_global_key boolean NOT NULL DEFAULT false,
  global_key_disabled_message text NOT NULL DEFAULT 'We are sorry, but because of increasing AI generation costs, we kindly ask you to use your own API key. Please go to Account → My AI API Key and add your Gemini API key to continue generating content.',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform settings"
  ON public.ai_platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can update platform settings"
  ON public.ai_platform_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Seed the single settings row
INSERT INTO public.ai_platform_settings (id) VALUES (1);


-- D) ai_usage_events: Usage logging for all AI calls
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL,
  tokens_input int,
  tokens_output int,
  cost_estimate numeric,
  provider text NOT NULL,
  key_source text NOT NULL CHECK (key_source IN ('personal', 'global', 'lovable')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_events_user ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_created ON public.ai_usage_events (created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read all usage events"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can read own usage events"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Insert policy for service role only (edge functions)
-- No authenticated insert policy needed
