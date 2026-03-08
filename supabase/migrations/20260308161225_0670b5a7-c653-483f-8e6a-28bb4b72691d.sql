
INSERT INTO public.ai_settings (key, value, description) VALUES
  ('tts_provider', '"browser"', 'TTS provider: browser or elevenlabs'),
  ('tts_voice_gender', '"male"', 'TTS voice gender: male or female'),
  ('tts_elevenlabs_male_voice', '"DWMVT5WflKt0P8OPpIrY"', 'ElevenLabs male voice ID'),
  ('tts_elevenlabs_female_voice', '"RCubfxZlU5rlyEKAEsSN"', 'ElevenLabs female voice ID')
ON CONFLICT (key) DO NOTHING;
