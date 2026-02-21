INSERT INTO public.ai_settings (key, value, description)
VALUES (
  'content_type_model_overrides',
  '{"mcq":"gemini-2.5-flash","flashcard":"gemini-2.5-flash","osce":"gemini-3.1-pro-preview","clinical_case":"gemini-3.1-pro-preview","essay":"gemini-2.5-flash","matching":"gemini-2.5-flash","guided_explanation":"gemini-3.1-pro-preview","virtual_patient":"gemini-3.1-pro-preview","mind_map":"gemini-2.5-flash","worked_case":"gemini-2.5-flash","case_scenario":"gemini-3.1-pro-preview"}'::jsonb,
  'Per-content-type model overrides. Maps content type to specific model ID. Use "default" or remove key to fall back to global model.'
)
ON CONFLICT (key) DO NOTHING;