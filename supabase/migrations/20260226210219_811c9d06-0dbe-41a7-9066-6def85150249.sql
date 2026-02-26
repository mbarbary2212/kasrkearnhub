
-- Fix security definer view by setting security_invoker
ALTER VIEW public.ai_case_attempt_summary SET (security_invoker = on);
