
ALTER TABLE public.tts_voices 
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'elevenlabs';

ALTER TABLE public.tts_voices 
  ALTER COLUMN elevenlabs_voice_id DROP NOT NULL;

-- Seed default Gemini voices
INSERT INTO public.tts_voices (name, elevenlabs_voice_id, gender, label, provider, display_order, is_active)
VALUES 
  ('Kore', NULL, 'male', 'Deep & steady', 'gemini', 1, true),
  ('Puck', NULL, 'male', 'Bright & energetic', 'gemini', 2, true),
  ('Charon', NULL, 'male', 'Warm & calm', 'gemini', 3, true),
  ('Fenrir', NULL, 'male', 'Strong & clear', 'gemini', 4, true),
  ('Orus', NULL, 'male', 'Neutral & balanced', 'gemini', 5, true),
  ('Zephyr', NULL, 'male', 'Soft & gentle', 'gemini', 6, true),
  ('Aoede', NULL, 'female', 'Clear & warm', 'gemini', 7, true),
  ('Leda', NULL, 'female', 'Soft & natural', 'gemini', 8, true)
ON CONFLICT DO NOTHING;
