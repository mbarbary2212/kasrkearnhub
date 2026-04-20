

## Coach silent failure — final root cause and the actual fix

### What I just verified end-to-end

| Check | Result |
|---|---|
| Gemini secret reachable from edge function | ✅ `test-ai-connection` with `provider=gemini, model=gemini-2.5-flash-lite` returned **200 ok** |
| Anthropic secret reachable from edge function | ✅ key works, but **the saved model `claude-3-5-haiku-20241022` returns 404 `not_found_error`** |
| `coach-chat` direct test | Returned 401 "Authentication Required" (expected — no signed-in user token in this curl), confirms function is alive and routing is correct |
| `coach-chat` recent logs | Empty — function hasn't been invoked since the redeploy, so the previous "empty response" you saw was from the OLD code path |
| Lovable secret store vs Supabase secret store | They're **separate**. Your screenshots prove `GOOGLE_API_KEY` and `ANTHROPIC_API_KEY` are in the Supabase store, which is what edge functions actually read. The Lovable secrets list does NOT show them, which is why I was misreading earlier. |

### So what's actually wrong

Two compounding issues, both data-only, no code change needed:

1. **`anthropic_model = claude-3-5-haiku-20241022`** is invalid at the Anthropic API. Confirmed with a live ping. Any time the Coach falls back to Anthropic (PDF too large, Gemini empty, etc.) it 404s. The admin "Test" button you saw fail is the same call.
2. **There is nothing wrong with the Gemini path right now.** Live ping with the currently saved `gemini-2.5-flash-lite` returned `ok: true`. So a new coach call from the signed-in app **should** succeed. The empty-response screen you saw earlier was from before the redeploy that added the JSON `generateContent` path + Anthropic fallback.

### The fix (data-only, preview-first, no code changes)

Update `ai_settings`:

| key | new value | reason |
|---|---|---|
| `anthropic_model` | `claude-sonnet-4-5` | Replaces the 404'ing Haiku. Verified Anthropic naming. Used by every Gemini→Anthropic fallback path |
| (leave) `ai_provider` | `gemini` | Already working per live test |
| (leave) `gemini_model` | `gemini-2.5-flash-lite` | Already working per live test |
| (leave) `lovable_model` | `google/gemini-3-flash-preview` | Unused unless we switch provider |
| (leave) `study_coach_provider`, `study_coach_model` | absent | Per your guardrail — do not create |

Stored as plain JSON strings to match the existing rows.

### Verification (after the upsert)

1. Re-run `test-ai-connection` for `provider=anthropic, model=claude-sonnet-4-5` → expect `{ok:true}`.
2. Sign in to the preview app → open Coach → ask "What is aspirin used for?"
3. Pull `coach-chat` logs and report the `[coach-chat] provider=gemini model=...` line plus whether streamed text rendered.
4. If Gemini returns empty for any reason, the Anthropic fallback now has a valid model and will deliver an answer instead of silently failing.

### What I will NOT touch

- `coach-chat/index.ts` (no code change needed; the redeployed version already has the correct JSON path + fallback)
- Auth, routing, env handling, deployment config
- `study_coach_provider` / `study_coach_model` rows
- Any production deploy step beyond what Lovable normally does on save
- Lovable secret store (the secrets the function needs are already in the Supabase store, which is the correct one)

### Files affected

| File | Change |
|---|---|
| `ai_settings` table | One UPSERT row: `anthropic_model = "claude-sonnet-4-5"` |
| Everything else | Untouched |

### Acceptance criteria

1. `SELECT value FROM ai_settings WHERE key='anthropic_model'` returns `"claude-sonnet-4-5"`.
2. `test-ai-connection` for Anthropic with that model returns `{ok:true}`.
3. A signed-in Coach question in the preview returns a non-empty streamed answer.
4. `coach-chat` log line `[coach-chat] provider=gemini model=gemini-2.5-flash-lite` is present for that request.
5. No code, auth, routing, or deployment files were modified.

