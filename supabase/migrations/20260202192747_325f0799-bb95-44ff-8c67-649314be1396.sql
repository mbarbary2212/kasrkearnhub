-- Add step_results column to ai_batch_jobs for per-step tracking
ALTER TABLE public.ai_batch_jobs 
ADD COLUMN IF NOT EXISTS step_results JSONB DEFAULT '[]'::jsonb;

-- Add stop_on_failure flag (default true)
ALTER TABLE public.ai_batch_jobs 
ADD COLUMN IF NOT EXISTS stop_on_failure BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_batch_jobs.step_results IS 'Array of step result objects tracking each content type generation: [{content_type, step_index, started_at, finished_at, status, generated_count, inserted_count, duplicate_count, approved_count, job_id, error_message, target_table}]';

COMMENT ON COLUMN public.ai_batch_jobs.stop_on_failure IS 'If true, batch stops processing on first failure. If false, continues to next content type.';