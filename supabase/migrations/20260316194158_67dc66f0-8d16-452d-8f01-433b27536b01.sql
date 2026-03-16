-- Insert the threshold setting into ai_settings
INSERT INTO public.ai_settings (key, value, description)
VALUES ('elevenlabs_alert_threshold', '5000', 'Credit threshold below which ElevenLabs low-balance email alerts are sent')
ON CONFLICT (key) DO NOTHING;

-- Enable pg_cron and pg_net extensions (may already exist)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily cron job at 8am UTC
SELECT cron.schedule(
  'check-elevenlabs-quota-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/check-elevenlabs-quota',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bXhub2twcmZpd212emtzeWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjM3NjQsImV4cCI6MjA4MTQ5OTc2NH0.wGf_n_j8hOIXCRzd2fV_-Zy0suHEY1vI4ggFaU-f6oo"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);