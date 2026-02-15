
-- Exam attempt answers: normalized per-question storage for essay/MCQ answers
CREATE TABLE public.exam_attempt_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq', -- 'mcq', 'essay', 'osce', 'clinical_case'
  answer_mode TEXT DEFAULT 'typed', -- 'typed' or 'handwriting'
  
  -- MCQ answer
  selected_key TEXT,
  
  -- Essay typed answer
  typed_text TEXT,
  
  -- Handwriting data (stored as base64 image or JSON strokes)
  handwriting_data TEXT,
  
  -- Typed summary for handwriting mode (required for marking)
  typed_summary TEXT,
  
  -- Revision tracking
  revision_count INT NOT NULL DEFAULT 0,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  
  -- Auto-save tracking
  last_autosave_at TIMESTAMPTZ,
  
  -- Scoring
  score NUMERIC,
  max_score NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS
ALTER TABLE public.exam_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Users can view their own answers
CREATE POLICY "Users can view own exam answers"
  ON public.exam_attempt_answers FOR SELECT
  USING (
    attempt_id IN (
      SELECT id FROM public.mock_exam_attempts WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own answers
CREATE POLICY "Users can insert own exam answers"
  ON public.exam_attempt_answers FOR INSERT
  WITH CHECK (
    attempt_id IN (
      SELECT id FROM public.mock_exam_attempts WHERE user_id = auth.uid()
    )
  );

-- Users can update their own answers (for autosave/revision)
CREATE POLICY "Users can update own exam answers"
  ON public.exam_attempt_answers FOR UPDATE
  USING (
    attempt_id IN (
      SELECT id FROM public.mock_exam_attempts WHERE user_id = auth.uid()
    )
  );

-- Admins can view all answers
CREATE POLICY "Admins can view all exam answers"
  ON public.exam_attempt_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Index for fast lookups
CREATE INDEX idx_exam_attempt_answers_attempt ON public.exam_attempt_answers(attempt_id);

-- Updated_at trigger
CREATE TRIGGER update_exam_attempt_answers_updated_at
  BEFORE UPDATE ON public.exam_attempt_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
