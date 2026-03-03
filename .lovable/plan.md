

## Fix: Gemini & Anthropic Retry + Cross-Provider Fallback

### Status: ✅ Implemented & Deployed

---

### What was implemented

#### 1. Retry with Exponential Backoff (`_shared/ai-provider.ts`)
- Added `fetchWithRetry()` helper: up to 2 retries with 1s/2s delay for 503 and 429 errors
- Applied to `callGeminiDirect`, `callGeminiWithMessages`, and `callAnthropicWithMessages`

#### 2. Cross-Provider Fallback (`run-ai-case/index.ts`)
- If primary provider fails with 503/429/402, automatically tries the alternate provider (Gemini→Anthropic or Anthropic→Gemini)
- No Lovable gateway dependency — works purely with direct API keys

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/ai-provider.ts` | Added `fetchWithRetry()`, applied to Gemini and Anthropic calls |
| `supabase/functions/run-ai-case/index.ts` | Added cross-provider fallback in non-streaming path |

### Important
- **Anthropic account needs credits** for it to work as a fallback. Top up at [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)
- Both providers need valid API keys (GOOGLE_API_KEY and ANTHROPIC_API_KEY are already configured)
