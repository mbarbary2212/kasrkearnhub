-- Create video_progress table for tracking Vimeo video playback
CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  last_time_seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric,
  percent_watched numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own rows
CREATE POLICY "Users can view their own video progress"
ON public.video_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own rows
CREATE POLICY "Users can insert their own video progress"
ON public.video_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own rows
CREATE POLICY "Users can update their own video progress"
ON public.video_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_video_progress_user_video ON public.video_progress(user_id, video_id);