

## Plan: Auth + quota for med-tutor-chat + fix 10 build errors

### 1. `supabase/functions/med-tutor-chat/index.ts` — Full rewrite

**Changes:**
- Add `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"` at top
- Update `corsHeaders` to include the extended headers (matching other functions)
- Refactor `getGlobalAISettings()` to accept `serviceClient` as a parameter instead of creating its own via dynamic import
- Insert auth guard after OPTIONS check: extract Bearer token → verify with `anonClient.auth.getUser()` → check `user_roles` table → allowedRoles includes `"student"` plus all admin/teacher roles → return 401/403 as appropriate
- Insert student quota check after auth: bypass for `['super_admin', 'platform_admin', 'department_admin', 'admin', 'teacher', 'topic_admin']`; for students, query `coach_usage` where `user_id = userId` and `question_date = today`; if `question_count >= 5`, return 200 with `{ limitReached: true, message: "You have reached your 5-question daily limit..." }`; otherwise upsert to increment count before calling AI
- Move `req.json()` after auth + quota blocks

### 2. Build error fixes (8 files)

| File | Fix |
|------|-----|
| `approve-ai-content/index.ts` line 16-30 | Add `\| "sba"` to `ContentType` union |
| `elevenlabs-scribe-token/index.ts` line 50 | `(err as Error).message` |
| `elevenlabs-tts/index.ts` line 108 | `(err as Error).message` |
| `notify-ticket-admins/index.ts` line 332 | `(error as Error).message` |
| `patient-history-chat/index.ts` line 119 | `(err as Error).message` |
| `run-ai-case/index.ts` top of file | Add `declare const EdgeRuntime: { waitUntil(p: Promise<any>): void };` |
| `score-case-answers/index.ts` line 195 | `(err as Error).message` |
| `sentry-ping/index.ts` line 80 | `(err as Error).message` |

### Files modified (9 total)

1. `supabase/functions/med-tutor-chat/index.ts`
2. `supabase/functions/approve-ai-content/index.ts`
3. `supabase/functions/elevenlabs-scribe-token/index.ts`
4. `supabase/functions/elevenlabs-tts/index.ts`
5. `supabase/functions/notify-ticket-admins/index.ts`
6. `supabase/functions/patient-history-chat/index.ts`
7. `supabase/functions/run-ai-case/index.ts`
8. `supabase/functions/score-case-answers/index.ts`
9. `supabase/functions/sentry-ping/index.ts`

