

## Plan: Add Overall Performance Summary with Explanations

### What the user wants
The scoring already saves per-section feedback (strengths, gaps, explanation) and displays it in collapsible sections. But there's no **overall summary** that explains *why* the student got the score they did, and what was good/bad across the whole case.

### Changes

**1. Update scoring prompt to include richer explanations (`score-case-answers/index.ts`)**

Update the system prompt to instruct the AI to also return a `justification` field — a 1-2 sentence explanation of *why* the score was given (not just feedback). Update the JSON shape to:
```json
{
  "score": 8,
  "justification": "Student covered 4 of 5 key history items but missed medication history.",
  "feedback": "...",
  "strengths": [...],
  "gaps": [...]
}
```
Save `justification` inside the existing `ai_feedback` JSON field alongside feedback/strengths/gaps.

**2. Add an Overall Summary card to CaseSummary (`CaseSummary.tsx`)**

After the score hero and before the category bars, add a new card that:
- Aggregates all section feedback into a **"Key Strengths"** list (top 3-4 unique strengths across all sections) and **"Areas to Improve"** list (top 3-4 gaps)
- Shows a brief per-section justification line (e.g., "History Taking: Covered 4/5 items but missed medication history")
- This is purely client-side aggregation from the already-stored `ai_feedback` data — no new AI call needed

**3. Auto-expand all sections by default**

Currently sections are collapsed. Change the default so all sections start **expanded** — the student wants to see their feedback immediately without clicking each one.

### Technical Details

- No database changes — `justification` is stored inside the existing `ai_feedback` JSON string
- The `parseFeedback` helper updated to also extract `justification`
- Overall summary card built from iterating `sectionAnswers` and collecting strengths/gaps
- Existing attempts will still work (justification will just be empty for old scores)

### Files modified
- `supabase/functions/score-case-answers/index.ts` — add `justification` to AI system prompt and save it
- `src/components/clinical-cases/CaseSummary.tsx` — add overall summary card, update parseFeedback, auto-expand sections

