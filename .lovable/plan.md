

## Problem

The save fails because of a **database check constraint** on the `virtual_patient_cases` table:

```sql
CHECK ((avatar_id >= 1) AND (avatar_id <= 4))
```

The "Mohamed paramedic" avatar has `id = 5`, which violates this constraint. Any save attempt (even just changing history interaction mode) sends `avatar_id: 5` in the payload, triggering the error.

The error message `"Failed to save"` is the toast shown when this DB constraint rejects the PATCH request.

## Fix

**Single migration** to drop the old constraint and replace it with one that accommodates all current and future avatars:

```sql
ALTER TABLE public.virtual_patient_cases
  DROP CONSTRAINT virtual_patient_cases_avatar_id_check;

ALTER TABLE public.virtual_patient_cases
  ADD CONSTRAINT virtual_patient_cases_avatar_id_check
  CHECK (avatar_id >= 1);
```

This removes the upper bound (`<= 4`) so new avatars added to `examiner_avatars` will work without needing further constraint updates. The `avatar_id` column already references the `examiner_avatars` table implicitly through application logic, so the `>= 1` check is sufficient to prevent invalid values.

### Files
| File | Change |
|------|--------|
| New migration SQL | Drop and recreate `virtual_patient_cases_avatar_id_check` without upper bound |

