
-- Create tts_voices table (similar to examiner_avatars)
CREATE TABLE public.tts_voices (
  id serial PRIMARY KEY,
  name text NOT NULL,
  elevenlabs_voice_id text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  label text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tts_voices ENABLE ROW LEVEL SECURITY;

-- Public read for active voices (same pattern as examiner_avatars)
CREATE POLICY "Anyone can read active TTS voices"
  ON public.tts_voices FOR SELECT
  USING (is_active = true);

-- Admin read all (active + inactive)
CREATE POLICY "Admins can read all TTS voices"
  ON public.tts_voices FOR SELECT
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()));

-- Admin insert
CREATE POLICY "Admins can insert TTS voices"
  ON public.tts_voices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Admin update
CREATE POLICY "Admins can update TTS voices"
  ON public.tts_voices FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()));

-- Seed with existing voices from tts.ts
INSERT INTO public.tts_voices (name, elevenlabs_voice_id, gender, label, display_order) VALUES
  ('Hanafi',    'DWMVT5WflKt0P8OPpIrY', 'male',   'Best overall', 1),
  ('Deep',      '68MRVrnQAt8vLbu0FCzw', 'male',   'Deep & authoritative', 2),
  ('Slow',      'VqHyN6PYNu3uNKGdbxKs', 'male',   'Calm & measured', 3),
  ('Energetic', 'IES4nrmZdUBHByLBde0P', 'male',   'Lively & expressive', 4),
  ('Dramatic',  'wxweiHvoC2r2jFM7mS8b', 'male',   'Dramatic & emotive', 5),
  ('Calm',      'Jez3JdhBInQTvlAvDOWR', 'male',   'Soft & reassuring', 6),
  ('Masry',     'LXrTqFIgiubkrMkwvOUr', 'male',   'Authentic Egyptian', 7),
  ('Fatma',     'RCubfxZlU5rlyEKAEsSN', 'female', 'Patient — warm', 8),
  ('Laila',     'V3pvijO4r7rCO7TB2tE8', 'female', 'Mother — assertive', 9),
  ('Yasmin',    'L10lEremDiJfPicq5CPh', 'female', 'Expressive', 10);
