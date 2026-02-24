

## Fix: Algorithm Delete RLS Error

### Root Cause
The SELECT policy on `interactive_algorithms` only allows visibility of rows where `is_deleted = false`. When the soft-delete UPDATE sets `is_deleted = true`, PostgREST (Supabase's API layer) checks whether the resulting row is still visible under the SELECT policy. Since it isn't, PostgreSQL rejects the operation with "new row violates row-level security policy."

This is the same error pattern -- the UPDATE WITH CHECK passes, but the SELECT visibility check for the new row fails.

### Fix
Add a second SELECT policy that allows admins to see ALL rows (including soft-deleted ones). This way, after the UPDATE, the row remains visible to the admin performing the operation.

### Changes

**New SQL migration:**

1. Add a new permissive SELECT policy for admins:
```sql
CREATE POLICY "Admins can view all algorithms"
ON public.interactive_algorithms
FOR SELECT
USING (
  can_manage_module_content(auth.uid(), module_id)
  OR (chapter_id IS NOT NULL 
      AND can_manage_chapter_content(auth.uid(), chapter_id))
  OR created_by = auth.uid()
);
```

Since permissive policies are OR'd together in PostgreSQL, the existing student policy (`is_deleted = false`) still works for students, while admins can see all rows -- including the row after it's been soft-deleted. This resolves the conflict.

No frontend code changes are needed.

