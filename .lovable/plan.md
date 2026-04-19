

Investigating the 406 error on `user_sessions`.
<lov-tool-use id="toolu_vrtx_019xpWmgws5nnyNxKmzNABsx" name="code--search_files" integration-id="code" data="{\"query\": \"user_sessions\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XJL9oDXccfVUkyeCUftGCP" name="code--search_files" integration-id="code" data="{\"query\": \"user_sessions\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>
The smoking gun is in `useSessionTracking.ts` line 36-44: it queries an existing session by id, filters by user_id, and uses `.single()`. If the session row was created by another user (from a previous account using same client) or doesn't exist or belongs to a different user_id, `.single()` returns 406.
<lov-tool-use id="toolu_vrtx_01BW2cWJmVHEmeLpYMwvHBSE" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useSessionTracking.ts\", \"lines\": \"25-75\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MqMn7398BfEAVsKLeq3mcB" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr, pg_get_expr(polwithcheck, polrelid) AS check_expr FROM pg_policy WHERE polrelid = 'public.user_sessions'::regclass;\"}">
</lov-tool-use>
Confirmed. RLS is fine. Root cause is `.single()` on a row that may not exist (lingering localStorage `current_session_id` from previous user/expired session).

<lov-plan>

## Root cause

`src/hooks/useSessionTracking.ts` line 36-41: when a user logs in, `startSession` reads `current_session_id` from localStorage and queries `user_sessions` with `.single()`:

```ts
const { data: existingSession } = await supabase
  .from('user_sessions')
  .select('id, session_end')
  .eq('id', existingSessionId)
  .eq('user_id', userId)
  .single();   // ← 406 when 0 rows
```

PostgREST returns **HTTP 406 Not Acceptable** whenever `.single()` finds 0 rows (or >1). This happens whenever the cached `current_session_id` no longer matches a row owned by the current user. Common triggers:

1. **Different user logs in on same browser** — the cached session id belongs to the previous user, so the `user_id = auth.uid()` filter excludes it.
2. **Old session was deleted/pruned** server-side.
3. **localStorage carried a session id across logout** — `endSession()` only removes the key on graceful logout; `beforeunload` and crashes leave it behind.
4. **Initial render race** — auth state has loaded `userId` but the row was never created (this is the page reload that produces the 406 in the current network log).

RLS is **not** the problem. Verified policies on `user_sessions`:
- `SELECT` allowed where `auth.uid() = user_id` ✓
- `INSERT WITH CHECK auth.uid() = user_id` ✓
- `UPDATE` allowed where `auth.uid() = user_id` ✓

Auth log confirms `/user` returns 200 (auth ready) right before the 406, so this is not the auth-readiness race from the stack-overflow pattern — it is purely a `.single()` vs. zero-rows mismatch.

## Why it keeps recurring on `/auth`

The user is currently on `/auth`. After login, `AuthContext` mounts `useSessionTracking(user.id)` immediately. localStorage still holds an `existingSessionId` from a prior visit (possibly a different account — e.g. `claude_student@kasralainy.edu.eg` per the auth logs), the lookup returns 0 rows under RLS, `.single()` → 406. Code then proceeds to `INSERT` a fresh session, so functionally nothing breaks — it is just noisy in the network panel and logs an error.

## Proposed fix (minimal, no schema/RLS changes)

**File:** `src/hooks/useSessionTracking.ts`

1. **Replace `.single()` with `.maybeSingle()`** on line 41. `maybeSingle()` returns `data: null` for 0 rows with a 200 response — the existing `if (existingSession && !existingSession.session_end)` branch already handles `null` correctly, so behavior is preserved.

2. **Defensively clear stale localStorage** when the lookup returns null OR when the session has ended, so the next login does not retry the same dead id:
   ```ts
   if (!existingSession || existingSession.session_end) {
     localStorage.removeItem(SESSION_ID_KEY);
   }
   ```

3. **Audit other `.single()` calls in the same file** (line 60 on insert is fine — insert always returns 1 row; line 96 on `endSession` selects by id we just wrote, also fine). No further changes needed.

4. **Optional follow-up (separate task, not part of this fix):** clear `SESSION_ID_KEY` inside the `signOut` flow in `useAuth` so account switches start clean. Flagging for review, will not include unless you say so.

## Expected outcome

- 406 disappears from the network panel on `/auth` and on every fresh login.
- No functional change for users with a valid resumable session.
- No DB migration, no RLS edit, no new dependencies.

## Files that will change

- `src/hooks/useSessionTracking.ts` — two lines (lines 36–48 region)

