

# Dual Error Tracking: Sentry + Better Stack

Keep both providers running side-by-side. Every frontend error goes to both Sentry and Better Stack simultaneously using Sentry's multi-client API.

## How it works

The Sentry SDK supports multiple `BrowserClient` instances, each with its own DSN and transport. We create two clients and fan out every `captureException` to both.

## Changes

### 1. `.env` — Add `VITE_BETTERSTACK_DSN`
Add the Better Stack DSN alongside the existing `VITE_SENTRY_DSN`. Both stay.

### 2. `src/lib/sentry.ts` — Dual-client initialization
- Import `BrowserClient`, `defaultStackParser`, `makeFetchTransport`, `Scope` from `@sentry/react`
- Create primary Sentry client with `VITE_SENTRY_DSN` (keeps replay + tracing)
- Create secondary Better Stack client with `VITE_BETTERSTACK_DSN` (no replay — unsupported)
- Set Sentry client as the global default (so `Sentry.captureException` still works for Sentry)
- Export `captureToAll(err)` helper that sends to both clients
- Export `betterStackClient` for direct access in diagnostics

### 3. `src/components/admin/SentryDiagnosticsSection.tsx` — Add Better Stack test button
- Add a third "Test Better Stack" button that sends a test event only to the Better Stack client
- Rename card title from "Monitoring / Sentry" to "Monitoring / Error Tracking"
- Update description to mention both providers
- Keep existing "Test Frontend" (Sentry) and "Test Edge" buttons unchanged

### 4. `src/main.tsx` — Update comment (line 27)
Change comment from "Sentry error monitoring" to "Sentry + Better Stack error monitoring". No functional change.

## Files touched

| File | Change |
|------|--------|
| `.env` | Add `VITE_BETTERSTACK_DSN` |
| `src/lib/sentry.ts` | Dual-client init, export helpers |
| `src/components/admin/SentryDiagnosticsSection.tsx` | Add Better Stack test button, relabel |
| `src/main.tsx` | Comment only |

No changes to edge functions, voice config, ElevenLabs, or student-facing components. The edge `sentry-ping` function continues using the Supabase runtime `SENTRY_DSN` secret — that can be updated separately later if you want edge errors in Better Stack too.

