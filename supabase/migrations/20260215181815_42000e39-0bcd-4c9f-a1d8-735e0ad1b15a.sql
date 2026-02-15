
-- 1. Add paper_index to mock_exam_attempts
ALTER TABLE mock_exam_attempts
ADD COLUMN paper_index integer DEFAULT 0;

-- 2. Add essay marking fields to exam_attempt_answers
ALTER TABLE exam_attempt_answers
ADD COLUMN marking_feedback jsonb DEFAULT NULL,
ADD COLUMN marked_at timestamptz DEFAULT NULL;

-- 3. Create exam_recheck_requests table
CREATE TABLE public.exam_recheck_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES mock_exam_attempts(id) ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES exam_attempt_answers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_recheck_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own recheck requests"
ON public.exam_recheck_requests FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins manage all recheck requests"
ON public.exam_recheck_requests FOR ALL
USING (public.is_platform_admin_or_higher(auth.uid()));

CREATE INDEX idx_recheck_requests_attempt ON public.exam_recheck_requests(attempt_id);
CREATE INDEX idx_recheck_requests_user ON public.exam_recheck_requests(user_id);
CREATE INDEX idx_recheck_requests_status ON public.exam_recheck_requests(status);
