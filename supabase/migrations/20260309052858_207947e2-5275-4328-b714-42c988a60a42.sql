ALTER TABLE mcqs ADD COLUMN question_format TEXT NOT NULL DEFAULT 'mcq' CHECK (question_format IN ('mcq', 'sba'));

COMMENT ON COLUMN mcqs.question_format IS 'Distinguishes MCQ (one correct answer) from SBA (single best answer, all choices plausible)';