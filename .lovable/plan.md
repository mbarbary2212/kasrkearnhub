

## Fix: Make Gemini & Anthropic Reliable (No Lovable Dependency)

You're right — once the college takes over, Lovable credits won't be available. The fix needs to work purely with Gemini and Anthropic, which are the providers your admins will use.

### Why it fails now

- **Gemini**: Google returns `503 (high demand)` — your code tries once and gives up immediately
- **Anthropic**: Returns `400 (insufficient credits)` — this is a billing issue on your Anthropic account, not a code bug. Top up at [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)

### Plan: Retry + Cross-Provider Fallback (No Lovable)

#### 1. Add retry with backoff in `_shared/ai-provider.ts`

In `callGeminiWithMessages` and `callGeminiDirect`: wrap the fetch in a retry loop — up to 2 retries with 1s/2s delay for 503 and 429 errors. Same for `callAnthropicWithMessages` on 503/529.

#### 2. Add Gemini ↔ Anthropic cross-fallback in `run-ai-case/index.ts`

In the non-streaming path (line 547-601), if the primary provider fails with a retryable error (503/429), automatically try the other direct provider before giving up:

```text
Primary (e.g. Gemini) → retry twice
  ↓ still fails
Fallback to Anthropic (or vice versa)
  ↓ still fails
Return error to student
```

This means if the admin sets Gemini as default but Google is overloaded, it silently tries Anthropic. If Anthropic is default but has billing issues, it tries Gemini. No Lovable dependency.

#### 3. Redeploy `run-ai-case`

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/ai-provider.ts` | Add retry loop (2 attempts, exponential backoff) in Gemini and Anthropic `WithMessages` and `Direct` functions for 503/429 |
| `supabase/functions/run-ai-case/index.ts` | After non-streaming call fails with 503/429, try the alternate direct provider (Gemini→Anthropic or Anthropic→Gemini) before returning error |

### Important

Your **Anthropic account has no credits** right now. The cross-fallback will help when one provider is down, but both providers need valid API keys and billing to serve as each other's backup. Top up your Anthropic balance so the fallback actually works.

