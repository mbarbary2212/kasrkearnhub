-- Add audio-specific columns to resources table
ALTER TABLE public.resources 
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

COMMENT ON COLUMN public.resources.audio_storage_path IS 'Supabase Storage path for audio files (resources-audio bucket only)';
COMMENT ON COLUMN public.resources.duration_seconds IS 'Audio duration in seconds for progress tracking';

-- Create audio_progress table for tracking user listening progress
CREATE TABLE IF NOT EXISTS public.audio_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  percent_listened REAL NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- Create updated_at trigger for audio_progress (matching video_progress pattern)
CREATE OR REPLACE FUNCTION public.update_audio_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_audio_progress_timestamp
  BEFORE UPDATE ON public.audio_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audio_progress_updated_at();

-- Enable RLS on audio_progress
ALTER TABLE public.audio_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_progress
CREATE POLICY "Users can view their own audio progress"
  ON public.audio_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio progress"
  ON public.audio_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio progress"
  ON public.audio_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audio progress"
  ON public.audio_progress FOR SELECT TO authenticated
  USING (
    is_platform_admin_or_higher(auth.uid()) 
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  );

-- Create private storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources-audio', 'resources-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Admin-only storage policies (NO broad SELECT for students)
-- Admins can upload audio files
CREATE POLICY "Admins can upload audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resources-audio' AND
    (
      is_platform_admin_or_higher(auth.uid()) OR
      has_role(auth.uid(), 'teacher') OR
      has_role(auth.uid(), 'admin')
    )
  );

-- Admins can update audio files
CREATE POLICY "Admins can update audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resources-audio' AND
    (
      is_platform_admin_or_higher(auth.uid()) OR
      has_role(auth.uid(), 'teacher') OR
      has_role(auth.uid(), 'admin')
    )
  );

-- Admins can delete audio files
CREATE POLICY "Admins can delete audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resources-audio' AND
    (
      is_platform_admin_or_higher(auth.uid()) OR
      has_role(auth.uid(), 'teacher') OR
      has_role(auth.uid(), 'admin')
    )
  );

-- Admins can list/view audio files directly
CREATE POLICY "Admins can select audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resources-audio' AND
    (
      is_platform_admin_or_higher(auth.uid()) OR
      has_role(auth.uid(), 'teacher') OR
      has_role(auth.uid(), 'admin')
    )
  );