

## Plan: Auth Guards for 4 Edge Functions + Mic Debug Logging

### Part 1: Auth Guards

Add the same auth guard pattern (from `med-tutor-chat`) to all 4 unprotected edge functions. Each gets: Bearer token extraction → `anonClient.auth.getUser()` → role check via service client → 401/403 responses.

**File: `supabase/functions/elevenlabs-tts/index.ts`**
- Add `import { createClient }` 
- After OPTIONS check (line 39), before `try { const { text, voiceId... }`:
  - Extract Bearer token, verify user, check role
  - `allowedRoles`: all roles including `"student"`
- Move the existing `try` body (parsing request, calling ElevenLabs) inside the auth-guarded block

**File: `supabase/functions/elevenlabs-scribe-token/index.ts`**
- Add `import { createClient }`
- After OPTIONS check (line 11), before `try { const ELEVENLABS_API_KEY...`:
  - Same auth guard, `allowedRoles` includes `"student"`

**File: `supabase/functions/generate-vp-case/index.ts`**
- Already imports `createClient`. After OPTIONS check (line 86), before `const { topic... }`:
  - Auth guard with admin-only roles: `["super_admin", "platform_admin", "admin", "teacher", "department_admin"]`

**File: `supabase/functions/generate-pathway/index.ts`**
- Already imports `createClient`. After OPTIONS check (line 106), before `const { topic... }`:
  - Same admin-only roles

All 4 functions already have `verify_jwt = false` in config.toml (correct — we validate in code).

### Part 2: Mic Debug Logging

**File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`**

Two additions (no logic changes):

1. **Line ~108** — Inside `onCommittedTranscript` callback, add `console.log('[Scribe] Committed transcript:', data.text)` as first line
2. **Line ~210** — At start of `sendChatMessage`, add `console.log('[sendChatMessage] called with:', text)` as first line

