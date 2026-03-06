

## Plan: Fix Scoring Not Triggering + Retry Mechanism

### Root Cause
The `supabase.functions.invoke('score-case-answers')` on line 150 of `StructuredCaseRunner.tsx` fires as "fire-and-forget" but the immediate navigation via `onComplete(attemptId)` causes the browser to **abort the pending HTTP request** before it reaches the server. This is why all recent attempts have `is_scored: false` but the function works perfectly when called directly.

### Fix (2 changes)

**1. CaseSummary.tsx — Add scoring retry**
When the summary page detects that answers are still unscored after 5 seconds of polling, it should trigger the scoring function itself. This guarantees scoring happens regardless of whether the initial fire-and-forget succeeded.

- Add a `useEffect` that tracks how long answers have been unscored
- After 5 seconds, if any answers are still `is_scored: false`, invoke `score-case-answers`
- Use a ref to ensure we only trigger once
- This also serves as the fallback for any future edge cases

**2. StructuredCaseRunner.tsx — Await the scoring call**
Change from fire-and-forget to awaiting the function invoke. This keeps the "Finishing..." spinner visible for a moment longer but ensures the request isn't cancelled. If the call fails or takes too long, we still navigate — the CaseSummary retry will catch it.

- Replace the `.catch()` pattern with an awaited call inside a try-catch
- Add a 15-second timeout using `AbortController` so the student isn't stuck
- Navigate regardless of success/failure (CaseSummary retry handles failures)

### Also fix: Score the other unscored attempt
The earlier attempt `60013304` also has all sections unscored. After deploying the fix, the user can re-open that summary page and it will auto-trigger scoring.

No database changes needed. No new edge functions.

