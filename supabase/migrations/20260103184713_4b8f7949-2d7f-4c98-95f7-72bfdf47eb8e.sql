-- Add test_mode column to mock_exam_attempts to track Easy vs Hard mode
ALTER TABLE public.mock_exam_attempts 
ADD COLUMN IF NOT EXISTS test_mode text NOT NULL DEFAULT 'easy';

-- Add comment for documentation
COMMENT ON COLUMN public.mock_exam_attempts.test_mode IS 'Test mode used: easy (practice) or hard (exam simulation)';