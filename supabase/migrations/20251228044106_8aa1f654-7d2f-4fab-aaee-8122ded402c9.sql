-- Insert the global setting for hiding empty self-assessment tabs
INSERT INTO public.study_settings (key, value)
VALUES ('hide_empty_self_assessment_tabs', 'false')
ON CONFLICT (key) DO NOTHING;