
-- Create chat_perf_logs table for storing voice chat performance timing data
CREATE TABLE public.chat_perf_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  case_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  stt_ms int,
  chat_api_ms int,
  chat_db_ms int,
  chat_ai_ms int,
  tts_api_ms int,
  tts_generation_ms int,
  audio_download_ms int,
  audio_play_ms int,
  total_ms int,
  tts_provider text,
  metadata jsonb
);

-- Index for admin queries
CREATE INDEX idx_chat_perf_logs_created_at ON public.chat_perf_logs (created_at DESC);
CREATE INDEX idx_chat_perf_logs_user_id ON public.chat_perf_logs (user_id);

-- Enable RLS
ALTER TABLE public.chat_perf_logs ENABLE ROW LEVEL SECURITY;

-- Students can insert their own rows
CREATE POLICY "Students can insert own perf logs"
  ON public.chat_perf_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all rows
CREATE POLICY "Admins can read all perf logs"
  ON public.chat_perf_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()));
