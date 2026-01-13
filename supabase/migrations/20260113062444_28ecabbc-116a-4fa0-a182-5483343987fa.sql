-- Create AI generation job log table for audit trail
CREATE TABLE public.ai_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.admin_documents(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_type text NOT NULL, -- 'mcq', 'flashcard', 'case_scenario', etc.
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'approved', 'rejected'
  input_metadata jsonb DEFAULT '{}', -- module_id, chapter_id, parameters
  output_data jsonb DEFAULT '{}', -- Generated content (draft)
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own and all jobs
CREATE POLICY "Admins can view AI generation jobs"
ON public.ai_generation_jobs
FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can create AI generation jobs"
ON public.ai_generation_jobs
FOR INSERT
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update AI generation jobs"
ON public.ai_generation_jobs
FOR UPDATE
USING (is_platform_admin_or_higher(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_ai_generation_jobs_document ON public.ai_generation_jobs(document_id);
CREATE INDEX idx_ai_generation_jobs_admin ON public.ai_generation_jobs(admin_id);
CREATE INDEX idx_ai_generation_jobs_status ON public.ai_generation_jobs(status);