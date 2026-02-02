-- Fix deprecated Gemini model causing 404
-- Store as proper JSON string in ai_settings.value
UPDATE public.ai_settings
SET value = to_jsonb('gemini-2.5-flash'::text),
    updated_at = now(),
    updated_by = auth.uid()
WHERE key = 'gemini_model';

-- If the setting row doesn't exist for some reason, create it
INSERT INTO public.ai_settings (key, value, description, updated_at)
SELECT 'gemini_model', to_jsonb('gemini-2.5-flash'::text), 'Default Gemini model for direct Gemini provider', now()
WHERE NOT EXISTS (SELECT 1 FROM public.ai_settings WHERE key = 'gemini_model');