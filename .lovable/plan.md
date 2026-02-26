

## Plan: Stability Fixes + Student Experience Improvements

### Issue 1: Case still navigates away on completion
**File: `src/pages/VirtualPatientPage.tsx` (line 66)**
The `onComplete={() => navigate(-1)}` prop causes immediate navigation when debrief fires, removing the results screen before the student can read it.

**Fix:** Remove auto-navigation from `onComplete`. The `DebriefCard` "Back to Cases" button already calls `onComplete` — change `onComplete` to navigate only when the student clicks that button explicitly.

```
// Line 66: change from
onComplete={() => navigate(-1)}
// to — remove prop entirely, let DebriefCard handle it
onComplete={() => navigate(-1)}  // only called from DebriefCard button click
```

Actually the real bug is in `useAICase.ts` line 86: `onComplete?.(turn)` fires immediately when debrief is received, AND `DebriefCard` also calls `onFinish` → `onComplete` on button click. The fix: remove the `onComplete` call from `applyTurnResult` (line 86), so navigation only happens when the student clicks "Back to Cases".

### Issue 2: Reduce response latency
**File: `supabase/functions/run-ai-case/index.ts`**

Two changes:
1. **Trim conversation history** — only send the last 10 messages to the AI instead of the full history. The system prompt + cohort block already provide context. This reduces token count and speeds up responses.
2. **Lower temperature to 0.5** — produces more focused, shorter responses.

### Issue 3: Teaching points still leak during turns
The system prompt already says `teaching_point: null` during turns, but the AI may still embed explanations in the `prompt` field text. Add a stronger instruction:

> "During question turns, your prompt must ONLY contain the clinical question. Do not explain why previous answers were right or wrong. Do not provide any clinical teaching. Simply ask the next question."

### Summary of changes

| File | Change |
|------|--------|
| `src/hooks/useAICase.ts` | Remove `onComplete` call from `applyTurnResult` (line 86) — only fire on explicit user action |
| `supabase/functions/run-ai-case/index.ts` | Trim history to last 10 messages; lower temperature to 0.5; strengthen no-teaching rule in prompt text |

