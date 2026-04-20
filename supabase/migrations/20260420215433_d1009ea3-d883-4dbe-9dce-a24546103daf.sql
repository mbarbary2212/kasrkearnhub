-- Create AI model catalog table for dynamic model management
CREATE TABLE IF NOT EXISTS public.ai_model_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('lovable', 'gemini', 'anthropic')),
  model_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (provider, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_catalog_provider_active
  ON public.ai_model_catalog (provider, is_active, sort_order);

-- Enable RLS
ALTER TABLE public.ai_model_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active models (the admin panel needs this for any admin)
CREATE POLICY "Authenticated users can view AI model catalog"
  ON public.ai_model_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can mutate
CREATE POLICY "Super admins can insert AI models"
  ON public.ai_model_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update AI models"
  ON public.ai_model_catalog
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete AI models"
  ON public.ai_model_catalog
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Auto-update updated_at
CREATE TRIGGER update_ai_model_catalog_updated_at
  BEFORE UPDATE ON public.ai_model_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current curated lists
INSERT INTO public.ai_model_catalog (provider, model_id, label, sort_order, is_default, notes) VALUES
  -- Lovable AI Gateway
  ('lovable', 'google/gemini-3-flash-preview', 'Gemini 3 Flash Preview (Fast)', 10, true, 'Default fast model via Lovable Gateway'),
  ('lovable', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (Balanced)', 20, false, NULL),
  ('lovable', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro (High Quality)', 30, false, NULL),
  ('lovable', 'openai/gpt-5-mini', 'GPT-5 Mini (OpenAI)', 40, false, NULL),
  -- Direct Gemini
  ('gemini', 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview (Advanced)', 10, false, NULL),
  ('gemini', 'gemini-3-flash-preview', 'Gemini 3 Flash Preview (Fast)', 20, false, NULL),
  ('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash (Balanced)', 30, true, 'Default balanced Gemini model'),
  ('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro (High Quality)', 40, false, NULL),
  ('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite (Fastest)', 50, false, NULL),
  -- Anthropic Claude (with newer Claude 4.5 + 3.5 Sonnet seeded)
  ('anthropic', 'claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5 (Latest)', 10, true, 'Released Sept 2025'),
  ('anthropic', 'claude-sonnet-4-20250514', 'Claude Sonnet 4 (Balanced)', 20, false, NULL),
  ('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 30, false, NULL),
  ('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku (Fast)', 40, false, NULL)
ON CONFLICT (provider, model_id) DO NOTHING;