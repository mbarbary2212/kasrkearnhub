

# Fix: Abort Case Does Not Clear Session

## Problem

Both issues reported stem from one root cause: when you click **Abort Case** inside the case runner, the session is **not cleared** from sessionStorage. So when you revisit the same case, the `useEffect` on page load auto-resumes the old attempt — skipping the intro screen (and the new briefing dialog) entirely.

The sticky layout and briefing dialog code are both present and correct in the codebase, but you never saw them because the session recovery bypassed the intro screen.

## Fix

**File:** `src/components/clinical-cases/StructuredCaseRunner.tsx`

In the Abort Case button handler (line 240), add a `sessionStorage.removeItem('ai_case_session')` call before navigating away. This ensures that after aborting, the next visit shows the intro screen with the briefing dialog.

```text
Before:
  onClick → stopAllTTS → navigate(...)

After:
  onClick → stopAllTTS → sessionStorage.removeItem('ai_case_session') → navigate(...)
```

One line added. No other files need changes.

