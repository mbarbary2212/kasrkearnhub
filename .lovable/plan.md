

# Session 1: Fix Suggestion Logic & Weak Labeling

## Problem
- `generateSuggestions()` uses flat scoring — not-started chapters get MCQ suggestions (wrong: should learn first)
- `detectWeakChapters()` uses `progress < 40` as proxy for weakness — falsely labels chapters as "weak" when they're simply not studied yet
- Returns 5 suggestions (too many, unfocused)
- No deduplication (can show multiple MCQs, multiple videos)

## Changes — Single File: `src/hooks/useStudentDashboard.ts`

### A. Add `classifyChapter` helper (new function)

Classifies each chapter into one of: `not_started`, `early`, `weak`, `unstable`, `strong`, `in_progress`.

- `not_started`: coverage === 0 and completedItems < 3
- `early`: coverage < 40 and completedItems < 5
- `weak`: completedItems >= 5 AND overall MCQ accuracy < 60% (from testProgress)
- `unstable`: completedItems >= 5 AND accuracy < 75%
- `strong`: coverage >= 70 AND accuracy >= 75%
- else: `in_progress`

Note: Per-chapter accuracy isn't available without schema changes, so we use module-level `testProgress.mcq.accuracy` combined with per-chapter coverage/completion counts to approximate.

### B. Rewrite `generateSuggestions()`

Replace flat scoring with rule-based priority:

1. For each non-completed chapter, call `classifyChapter`
2. Based on state, add suggestions with appropriate types and reasons:
   - `not_started` / `early` → video (priority 80, "Not covered yet") + read (70, "Build core understanding"). MCQ is NOT suggested.
   - `weak` → mcq (priority 90, "Low recent accuracy") + video (60, "Review explanation")
   - `unstable` → mcq (priority 75, "Needs reinforcement")
   - `in_progress` → mcq (priority 65, "Continue where you left")
3. Collect all scored items, sort by priority descending
4. **Deduplication before slicing**: max 1 per type (1 mcq, 1 video, 1 read, 1 flashcard)
5. **Slice to 3** (not 5)
6. Mark top item as `isPrimary: true`

### C. Rewrite `detectWeakChapters()`

Remove the false-positive logic:
- Remove `c.progress < 40` condition (confuses "not studied" with "weak")
- Only flag weak if: `testProgress.mcq.attempts >= 5 AND testProgress.mcq.accuracy < 60`
- When flagging, attach the first in-progress chapter with the most completedItems (most studied = most meaningful weak signal)
- Stop using `c.progress` as `accuracy` proxy — use `testProgress.mcq.accuracy` directly

### D. No interface changes needed
`SuggestedItem` already has `reason`, `isPrimary`, `subtab` from Phase 1. `WeakChapter` interface unchanged.

## Result
- Not-started chapters get learning suggestions (video/read), not practice
- "Weak" label only appears with real accuracy data (>=5 attempts, <60%)
- Dashboard shows 3 focused actions instead of 5
- No duplicate suggestion types

