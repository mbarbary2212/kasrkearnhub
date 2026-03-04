

## Create `sentry-ping` Edge Function and Rewire Test Edge Button

### Current State
- `sentry-ping` does **not exist yet** — the previous conversation only planned it
- The "Test Edge" button currently calls `run-ai-case` with `{ sentry_test: true }`
- All other edge functions in this project use `verify_jwt = false` (JWT validated in code via `getClaims`)

### Important Note on `verify_jwt`
Per this project's conventions and the Supabase signing-keys system, **all functions use `verify_jwt = false`** and validate JWTs in code. ChatGPT's suggestion to set `verify_jwt = true` contradicts this project's established pattern and would break consistency. I will follow the existing pattern (`verify_jwt = false` + in-code `getClaims()` + `super_admin` role check).

### Plan

**1. Create `supabase/functions/sentry-ping/index.ts`**
- Import `@sentry/deno` (same pattern as `run-ai-case`)
- Standard CORS headers
- Validate JWT via `getClaims()`, check `super_admin` role via service-role client query on `user_roles`
- Call `Sentry.captureMessage('SENTRY_EDGE_PING')`, flush, return `{ ok: true }`
- Return 401/403 for unauthorized callers

**2. Add to `supabase/config.toml`**
- `[functions.sentry-ping]` with `verify_jwt = false` (project convention)

**3. Update `src/components/admin/SentryDiagnosticsSection.tsx`**
- Change `handleEdgeTest` to invoke `sentry-ping` instead of `run-ai-case`

**4. Leave `run-ai-case` untouched** — the old `sentry_test` branch can be cleaned up later.

| File | Action |
|------|--------|
| `supabase/functions/sentry-ping/index.ts` | Create |
| `supabase/config.toml` | Add entry |
| `src/components/admin/SentryDiagnosticsSection.tsx` | Update invoke target |

