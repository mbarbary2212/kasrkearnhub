
-- Table to store each student's last navigation position
CREATE TABLE public.student_last_position (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_number INTEGER,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  module_name TEXT,
  module_slug TEXT,
  book_label TEXT,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  chapter_title TEXT,
  tab TEXT,
  activity_position JSONB DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT student_last_position_user_unique UNIQUE (user_id)
);

-- RLS
ALTER TABLE public.student_last_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own position"
  ON public.student_last_position FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own position"
  ON public.student_last_position FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own position"
  ON public.student_last_position FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_student_last_position_user ON public.student_last_position(user_id);
