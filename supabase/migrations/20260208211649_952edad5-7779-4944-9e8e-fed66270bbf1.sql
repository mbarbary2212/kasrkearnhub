-- Fix existing audit_log records for access request approvals
-- Add source: 'access_request' to metadata for invitations that came from access requests

UPDATE audit_log
SET metadata = metadata || '{"source": "access_request"}'::jsonb
WHERE action = 'USER_INVITED'
  AND metadata->>'email' IN (
    SELECT email FROM access_requests WHERE status = 'approved'
  )
  AND (metadata->>'source' IS NULL OR metadata->>'source' = '');