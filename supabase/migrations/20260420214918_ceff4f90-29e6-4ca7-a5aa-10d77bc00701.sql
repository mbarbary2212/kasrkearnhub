-- Seed missing AI settings rows so admin panel saves never fail on missing keys
INSERT INTO public.ai_settings (key, value, description)
VALUES
  ('anthropic_model', '"claude-sonnet-4-20250514"'::jsonb, 'Default Anthropic model used as fallback / when provider=anthropic'),
  ('ai_provider', '"gemini"'::jsonb, 'Global default AI provider (gemini | anthropic | lovable)'),
  ('gemini_model', '"gemini-2.5-flash-lite"'::jsonb, 'Global default Gemini model'),
  ('lovable_model', '"google/gemini-3-flash-preview"'::jsonb, 'Global default Lovable AI Gateway model')
ON CONFLICT (key) DO NOTHING;