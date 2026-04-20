UPDATE public.ai_settings 
SET value = '"gemini-2.5-flash"'::jsonb, updated_at = now()
WHERE key = 'gemini_model';