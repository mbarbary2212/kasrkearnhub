

# Update Header Icon, Remove Schedule Buttons, Fix FSRS Rating Visibility

## What's Wrong

1. **Header icon** still shows `CalendarClock` — should be `GalleryHorizontal` (flashcard visual). Blue dot logic for "upcoming but not due" is unnecessary clutter.
2. **CalendarPlus/CalendarCheck** "add to schedule" buttons still on card corners in both `FlashcardsStudentView` and `FlashcardsSlideshowMode`. FSRS handles scheduling automatically on first rating — no manual toggle needed.
3. **FSRS rating buttons don't appear** because `FSRSRatingButtons` returns null when `fsrsState === null` (cards with no `flashcard_states` row yet).
4. **`useRateCard` crashes** for first-time ratings because it calls `.single()` which errors when no row exists. Must fallback to `createEmptyCard()`.
5. **Banner** shows unnecessary upcoming breakdown. Simplify to one line.

## Changes

### File 1: `src/components/layout/MainLayout.tsx`
- Line 20: Replace `CalendarClock` with `GalleryHorizontal` in lucide import
- Line 28: Remove `useUpcomingCardCounts` import (keep only `useDueCardCount`)
- Lines 43-44: Remove `upcoming` and `totalScheduledCount` variables
- Line 155: Replace `<CalendarClock>` with `<GalleryHorizontal>`
- Lines 156-162: Replace badge logic — only show red badge when `dueCount > 0`, remove blue dot entirely
- Lines 166-170: Tooltip text → `"X flashcards due today"` or `"Flashcards"`

### File 2: `src/components/study/FlashcardsStudentView.tsx`
- Line 2: Remove `CalendarPlus, CalendarCheck` from lucide imports
- Line 10: Remove `useScheduleCard, useIsCardScheduled` from useFSRS import
- Lines 74, 117: Remove `scheduleCard` and `isScheduled` hook calls
- Lines 120-126: Remove `handleToggleSchedule` callback
- Lines 353-366: Delete the CalendarPlus/CalendarCheck button block entirely
- Keep: star button, fullscreen button, rating buttons

### File 3: `src/components/study/FlashcardsSlideshowMode.tsx`
- Line 2: Remove `CalendarPlus, CalendarCheck` from lucide imports
- Line 10: Remove `useScheduleCard, useIsCardScheduled` from useFSRS import
- Lines 83, 91: Remove `scheduleCard` and `isCurrentScheduled` hook calls
- Lines 447-463: Delete the CalendarPlus/CalendarCheck button block entirely
- Keep: star button, fullscreen button, rating buttons

### File 4: `src/components/study/FSRSRatingButtons.tsx`
- Add `import { createEmptyCard } from 'ts-fsrs'`
- Line 37: Instead of `if (!fsrsState) return null`, use `createEmptyCard()` as fallback
- Change interval computation: `const card = fsrsState ? rowToCard(fsrsState) : createEmptyCard()`
- Line 47: Remove `!fsrsState` from the early return — only check `!visible || !intervals || !cardId`

### File 5: `src/hooks/useFSRS.ts` (required for first-time ratings to work)
- Lines 77-83: Change `.single()` to `.maybeSingle()` so missing rows return null instead of throwing
- Lines 85-86: If `row` is null, use `createEmptyCard()` instead of `rowToCard(row)`
- Add `createEmptyCard` to the existing `ts-fsrs` import at line 6

### File 6: `src/components/study/ScheduledReviewBanner.tsx`
- Remove `useUpcomingCardCounts` import and `upcoming` variable
- Remove the upcoming breakdown paragraph (Tomorrow/In 7 days/In 1 month)
- Keep: single line "You have X flashcards due for review today" + Start button

## Not Changed
- `src/lib/fsrs.ts`, `FlashcardsTab.tsx`, `Home.tsx`, `App.tsx`
- Flip animations, swipe, fullscreen, progress bar
- Star/bookmark system
- `ScheduledReviewAlert.tsx` (already correct)
- Admin views, MCQ, SBA, clinical case, voice/TTS

