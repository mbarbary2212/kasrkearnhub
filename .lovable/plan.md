

# Pass 1: FSRS Backend — Install, Migrate, Build Hooks

The plan from Claude is solid and well-aligned with the existing codebase. Here's my assessment and the implementation approach:

## Assessment

**The plan is good as-is.** Key observations:

- The old `scheduled_reviews` table and `useScheduledReviews.ts` are preserved — no data loss, no regressions
- The new `flashcard_states` table uses `timestamptz` for `due` (vs the old `date`-based `due_date`) — this enables sub-day scheduling which FSRS needs for learning steps
- The `flashcard_review_logs` table is append-only, which is correct for analytics
- Both tables reference `study_resources(id)` for `card_id`, matching the existing pattern
- RLS policies are simple user-scoped `for all` — same pattern as `scheduled_reviews`
- No `src/lib/fsrs.ts` or `src/hooks/useFSRS.ts` exist yet — clean slate

**One small adjustment**: The `useFSRS.ts` hooks will query `flashcard_states` and `flashcard_review_logs` which aren't in the generated Supabase types. I'll use `as any` casting (same pattern already used for `scheduled_reviews`, `card_ratings` — see existing hooks).

## Implementation Steps

### 1. Install `ts-fsrs`
Add `ts-fsrs` to package.json dependencies.

### 2. Database Migration
Create two tables with RLS:
- `flashcard_states` — FSRS card state per user+card, indexed on `(user_id, due)`
- `flashcard_review_logs` — append-only review log

### 3. Create `src/lib/fsrs.ts`
Shared scheduler instance configured for 90% retention, 365-day max interval, fuzz enabled. Plus `rowToCard()` helper to reconstruct ts-fsrs Card objects from DB rows.

### 4. Create `src/hooks/useFSRS.ts`
Seven hooks mirroring the existing `useScheduledReviews.ts` API shape but powered by FSRS:
- `useScheduleCard` — toggle insert/delete on `flashcard_states`
- `useRateCard` — core FSRS mutation (fetch state → compute next → upsert + log)
- `useDueCards` — due cards with joined content
- `useDueCardCount` — lightweight count for badges
- `useUpcomingCardCounts` — today/tomorrow/week/month breakdown
- `useIsCardScheduled` — boolean check
- `useCardState` — full state row for a card

### Files touched
| Action | File |
|--------|------|
| Install | `ts-fsrs` in package.json |
| DB migration | 2 new tables + RLS + index |
| Create | `src/lib/fsrs.ts` |
| Create | `src/hooks/useFSRS.ts` |

No UI files modified. `useScheduledReviews.ts` untouched.

