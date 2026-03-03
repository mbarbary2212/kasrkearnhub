

## Current State

The file `supabase/functions/run-ai-case/index.ts` **already has Sentry integrated correctly**:

- Line 1: `import * as Sentry from "https://deno.land/x/sentry@8.45.0/index.mjs";`
- Lines 4-7: `Sentry.init(...)` with DSN from env
- Lines 604-605: `Sentry.captureException(error)` and `await Sentry.flush(2000)` in the catch block
- Single `Deno.serve` with proper try/catch structure

The only minor differences from the ChatGPT suggestion are:
1. **`tracesSampleRate: 0.2`** instead of `1.0` (0.2 is actually better for production — sampling 100% of traces is expensive and unnecessary)
2. **Sentry calls are not wrapped in a nested try/catch** — if Sentry itself throws, the 500 response won't be returned. This is a minor robustness improvement worth making.

### Plan (single file, minimal change)

**`supabase/functions/run-ai-case/index.ts`** — Wrap the Sentry calls in the catch block with a nested try/catch so a Sentry failure doesn't prevent the 500 response from being returned:

```typescript
  } catch (error: any) {
    console.error("Edge function error:", error);
    try {
      Sentry.captureException(error);
      await Sentry.flush(2000);
    } catch {}
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
```

No other changes needed. The file already matches the pasted code with Sentry properly integrated.

