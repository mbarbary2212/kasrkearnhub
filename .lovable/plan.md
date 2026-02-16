

## Fix: Admin Exam Results Showing "0 Completed Attempts"

### Root Cause

The `useModuleExamAttempts` hook in `src/hooks/useExamResults.ts` uses this query:

```
.select('*, profiles:user_id(full_name, avatar_url)')
```

This tells PostgREST to join `profiles` via the `user_id` foreign key. However, the FK on `mock_exam_attempts.user_id` points to `auth.users`, **not** `profiles`. PostgREST returns a **400 error** ("Could not find a relationship between 'mock_exam_attempts' and 'user_id'"), and the error is silently swallowed, resulting in an empty array -- hence "0 completed attempts."

The database actually contains **11 completed attempts** for this module.

### Fix

**File: `src/hooks/useExamResults.ts`** -- `useModuleExamAttempts` function

Change the query to a two-step approach:

1. Fetch all completed attempts (without the broken join)
2. Collect unique `user_id` values, then fetch their profiles separately
3. Merge the profile data (name, avatar) into the attempt objects before returning

This avoids requiring a PostgREST foreign key relationship between `mock_exam_attempts` and `profiles`, which doesn't exist.

### Technical Detail

```text
Step 1: SELECT * FROM mock_exam_attempts
        WHERE module_id = ? AND is_completed = true
        ORDER BY submitted_at DESC

Step 2: SELECT id, full_name, avatar_url FROM profiles
        WHERE id IN (unique user_ids from step 1)

Step 3: Merge -- attach profile info to each attempt object
        as attempt.profiles = { full_name, avatar_url }
```

No database migration needed. No other files need changes since `AdminExamResultsTab.tsx` already reads `attempt.profiles?.full_name`, which will work with the merged data.

