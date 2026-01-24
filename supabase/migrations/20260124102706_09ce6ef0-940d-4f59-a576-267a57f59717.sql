-- Create activity_logs table for audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID NOT NULL,
  actor_role TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  scope JSONB NULL,
  metadata JSONB NULL
);

-- Create indexes for common queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_actor_user_id ON public.activity_logs (actor_user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs (action);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs (entity_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- No INSERT policy for regular users (only service role can insert)
-- SELECT policy for admins only
CREATE POLICY "Super admins can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'platform_admin')
  )
);

CREATE POLICY "Module admins can view logs for their modules"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'department_admin', 'topic_admin')
  )
  AND (
    actor_user_id = auth.uid()
    OR scope->>'module_id' IN (
      SELECT module_id::text FROM public.module_admins WHERE user_id = auth.uid()
    )
  )
);