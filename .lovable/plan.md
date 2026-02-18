

## Fix: CORS Headers Blocking Auth in generate-content-from-pdf

### Root Cause

The Supabase JS client (v2.88+) sends extra `x-supabase-*` headers with every request. The edge function's CORS `Access-Control-Allow-Headers` does not list them, so the browser's CORS preflight rejects them and the `Authorization` header never reaches the function -- resulting in **401 "Auth session missing!"**.

This is NOT an AI engine or API key issue. The frontend already uses `supabase.functions.invoke()` correctly.

### Fix (single line change)

**File: `supabase/functions/generate-content-from-pdf/index.ts`** (line 7-10)

Replace the current CORS headers:
```
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

With:
```
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

The OPTIONS handler on line 772 is already correct -- no changes needed there.

### What This Does

- Allows all `x-supabase-*` headers through the CORS preflight
- The `Authorization` header will now reach the function on every call
- Eliminates the intermittent 401 errors during content generation

### What Does NOT Change

- No AI provider or model changes
- No frontend code changes (already using `supabase.functions.invoke` correctly)
- No changes to auth logic, validation, or generation flow
