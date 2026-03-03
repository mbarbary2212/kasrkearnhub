

## Diagnosis: `Sentry.flush(2000)` is blocking the edge function

The `run-ai-case` function has two places where `await Sentry.flush(2000)` blocks execution for up to **2 full seconds**:

1. **Line 302** — the `sentry_test` handler (only affects test calls, not students)
2. **Line 655** — the main error catch block (affects **every error response**)

Supabase Edge Functions have a strict **2-second CPU time limit**. The `Sentry.flush(2000)` call blocks for up to 2s waiting for Sentry to deliver events over the network. Combined with the actual work the function does, this can push the function past the CPU limit, causing timeouts or sluggishness even on successful requests if Sentry.init() adds overhead to cold starts.

Additionally, `Sentry.init()` runs at the top level on **every cold start**, adding latency to the first request.

### Fix: Make Sentry non-blocking with `EdgeRuntime.waitUntil`

Use `EdgeRuntime.waitUntil()` to offload Sentry calls to the background so they don't block the response.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/run-ai-case/index.ts` | **Line 300-303**: Replace synchronous `Sentry.captureException` + `flush` with `EdgeRuntime.waitUntil(...)` so the test returns instantly |
| `supabase/functions/run-ai-case/index.ts` | **Line 653-656**: Same fix in the main catch block — wrap `Sentry.captureException` + `flush` in `EdgeRuntime.waitUntil(...)` so error responses return immediately without waiting 2s for Sentry delivery |

Both changes follow this pattern:

```typescript
// BEFORE (blocking — adds up to 2s)
try {
  Sentry.captureException(error);
  await Sentry.flush(2000);
} catch {}

// AFTER (non-blocking — returns instantly)
EdgeRuntime.waitUntil(
  (async () => {
    try {
      Sentry.captureException(error);
      await Sentry.flush(2000);
    } catch (e) {
      console.error("Sentry flush failed:", e);
    }
  })()
);
```

This ensures Sentry events still get delivered, but the response is returned to the student immediately. The background task completes after the response is sent.

