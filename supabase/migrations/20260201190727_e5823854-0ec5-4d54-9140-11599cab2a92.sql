-- Add MedGPT Tutor settings to ai_settings
INSERT INTO ai_settings (key, value, description) VALUES
  ('tutor_enabled', 'true', 'Enable/disable MedGPT Tutor feature'),
  ('tutor_daily_limit', '5', 'Daily question limit for students'),
  ('tutor_disabled_message', '"The MedGPT Tutor is temporarily unavailable. Please use Feedback & Inquiries."', 'Message shown when tutor is disabled'),
  ('tutor_provider', '"lovable"', 'AI provider for tutor (lovable or gemini)'),
  ('tutor_model', '"google/gemini-3-flash-preview"', 'Model to use for tutor')
ON CONFLICT (key) DO NOTHING;