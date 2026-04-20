UPDATE public.ai_settings
SET value = '"claude-sonnet-4-5"'::jsonb,
    updated_at = now()
WHERE key = 'anthropic_model';