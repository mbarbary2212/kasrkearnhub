

# Fix N+1 `question_attempts` Queries on Chapter Page

## Problem

The chapter page fires multiple redundant queries per load from two sources:

### Source 1: `useChapterQuestionAttempts` (confirmed in current code)
Called 4 times from McqList (`mcq`), OsceList (`osce`), MatchingQuestionList (`mcq`), TrueFalseList (`mcq`). Each call:
- Calls `getCurrentAttemptNumber()` → 1-2 queries to `chapter_attempts` per type
- Then `select('*')` on `question_attempts` filtered by `chapter_id` + `question_type`

**Total: ~12 queries** for attempt status alone.

### Source 2: 7 count hooks (HEAD requests)
`useChapterMcqCount`, `useChapterSbaCount`, `useChapterOsceCount`, `useChapterMatchingCount`, `useChapterTrueFalseCount`, `useChapterEssayCount`, `useChapterClinicalCaseCount` — each fires a separate HEAD request.

### Source 3: Legacy N+1 pattern (from Sentry)
The Sentry trace shows an older pattern (GET `mcqs?select=id`, then `question_attempts?select=question_id&question_id=in.(...)` per type). This is either from a stale client or unreplaced code. The RPC should have eliminated this, but the presence in Sentry means users are still hitting it.

## Plan

### Step 1: Consolidate `useChapterQuestionAttempts` into a single query

**File:** `src/hooks/useQuestionAttempts.ts`

Create a new hook `useAllChapterQuestionAttempts(chapterId)` that:
1. Fetches `getCurrentAttemptNumber` ONCE (without question_type filter — get max across types)
2. Makes ONE query: `question_attempts.select('question_id, question_type, is_correct, selected_answer, score, status').eq('chapter_id', chapterId).eq('user_id', userId)`
3. Returns a Map grouped by `question_type` for consumers
4. Uses `staleTime: 5 * 60 * 1000` (5 minutes) and stable query key `['chapter-question-attempts', chapterId, userId]`

Keep the old `useChapterQuestionAttempts` as a thin wrapper that reads from the consolidated query and filters by type client-side.

**Fix `getCurrentAttemptNumber`**: Currently requires `questionType` param. Add an overload or separate function that gets the max attempt across ALL types in one query, since the components on the chapter page need all types simultaneously.

### Step 2: Narrow select and add caching

Change `select('*')` to `select('question_id, question_type, is_correct, selected_answer, score, status')` — only the columns consumed by the list components.

### Step 3: Update consumers

**Files:** 
- `src/components/content/McqList.tsx`
- `src/components/content/OsceList.tsx`
- `src/components/content/MatchingQuestionList.tsx`
- `src/components/content/TrueFalseList.tsx`

Replace `useChapterQuestionAttempts(chapterId, 'mcq')` calls with the consolidated hook. Filter by question_type in the component.

### Step 4: Guard against empty data

Add early return when `chapterId` is undefined — prevents wasted queries.

## Impact

| Before | After |
|--------|-------|
| ~12 `question_attempts` + `chapter_attempts` queries | 2 queries (1 chapter_attempts + 1 question_attempts) |
| `select(*)` | 6 columns |
| `staleTime: 10000` (10s) | `staleTime: 300000` (5 min) |
| Re-fires on every tab switch | Cached across tab switches |

Combined with the RPC fix for progress, the chapter page drops from ~30+ queries to ~12 (count hooks + consolidated attempt query + RPC + content fetches).

## Not in scope (follow-up)
- Consolidating the 7 count hooks into a single RPC (separate optimization)
- The legacy N+1 pattern in Sentry will stop appearing once stale clients refresh

