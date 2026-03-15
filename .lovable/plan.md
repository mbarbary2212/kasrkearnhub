

# Pass 2: Wire FSRS into UI

## What Claude's two prompts mean

The first prompt is a **bug fix for the second prompt**. The second prompt (Pass 2 spec) contains a mistake in Steps 6 and 7 — it shows `useCardState()` being called inside JSX props like `fsrsState={useCardState(...).data}`. This violates React's Rules of Hooks (hooks must be called at the top level of a component, not inside JSX). The first prompt corrects this by saying: call `useCardState()` at the top of the component, store the result in a variable, then pass that variable to JSX.

Both prompts together = one task: implement Pass 2 with the hook-call fix applied.

## Implementation Plan

### Step 1 — Create `src/components/study/FSRSRatingButtons.tsx`
New shared component with 4 rating buttons (Again/Hard/Good/Easy). Uses `scheduler.next()` to compute interval previews. Calls `useRateCard()` on tap. Disabled during mutation.

### Step 2 — Update `ScheduledReviewAlert.tsx` (lines 13, 17-18)
Swap imports: `useDueReviewCount, useDueReviews` from `useScheduledReviews` → `useDueCardCount, useDueCards` from `useFSRS`.

### Step 3 — Update `ScheduledReviewBanner.tsx` (line 4, 8-10)
Swap imports: `useDueReviewCount, useDueReviews, useUpcomingReviewCounts` → `useDueCardCount, useDueCards, useUpcomingCardCounts` from `useFSRS`.

### Step 4 — Update `MainLayout.tsx` (lines 28-29, 46-47)
Replace `useDueReviewCount`/`useDueReviews`/`useScheduledReviewTotalCount` with `useDueCardCount`/`useUpcomingCardCounts` from `useFSRS`. Blue dot logic: sum upcoming buckets > 0.

### Step 5 — Rewrite `FlashcardReviewPage.tsx`
- Replace `useDueReviews`/`useMarkReviewsComplete`/`useUpcomingReviewCounts` with `useDueCards`/`useRateCard`/`useUpcomingCardCounts` from useFSRS
- Remove old Prev/Next buttons, add `<FSRSRatingButtons>` shown when flipped
- Track `ratingCounts` state, show summary on completion
- NoCardsDueScreen: query `flashcard_states` instead of `scheduled_reviews`

### Step 6 — Update `FlashcardsStudentView.tsx` (line 10)
- Swap imports to useFSRS: `useScheduleCard`, `useIsCardScheduled`, `useCardState`
- Add `const { data: fsrsState } = useCardState(currentCard?.resource?.id)` at component top level (the correction)
- Add `<FSRSRatingButtons>` after flip card div, visible when `flipped`
- Add next-due toast after rating

### Step 7 — Update `FlashcardsSlideshowMode.tsx` (line 10)
- Swap imports to useFSRS
- Add `const { data: slideshowFsrsState } = useCardState(currentResource?.id)` at component top level
- Add `<FSRSRatingButtons>` visible when `state === 'paused' && flipped`

## Files

| Action | File |
|--------|------|
| Create | `src/components/study/FSRSRatingButtons.tsx` |
| Update | `src/components/review/ScheduledReviewAlert.tsx` |
| Update | `src/components/study/ScheduledReviewBanner.tsx` |
| Update | `src/components/layout/MainLayout.tsx` |
| Update | `src/pages/FlashcardReviewPage.tsx` |
| Update | `src/components/study/FlashcardsStudentView.tsx` |
| Update | `src/components/study/FlashcardsSlideshowMode.tsx` |

No changes to: `useFSRS.ts`, `fsrs.ts`, `useScheduledReviews.ts`, `FlashcardsTab.tsx`, `Home.tsx`, `App.tsx`, or any admin/voice/TTS components.

