

# Show Review Due Count in Header — Plan

## Problem
Students who stay logged in never visit the Home page, so they miss the `ScheduledReviewAlert`. The notification needs to live in the persistent header.

## Solution
Add a **CalendarClock icon button with a badge count** in the header, right next to the existing Trophy icon (students only). When tapped, it navigates using the same smart routing logic. This mirrors the pattern already used for the Trophy (achievements) button.

```text
Header layout (students only):
[Logo] [🏆 Trophy] [📅 Reviews(3)]  ...  [Avatar]
```

## Changes

### `src/components/layout/MainLayout.tsx`
- Import `CalendarClock` from lucide-react and `useDueReviewCount`, `useDueReviews` from `useScheduledReviews`
- After the Trophy button block (line ~139), add a new student-only icon button:
  - `CalendarClock` icon with same styling pattern as Trophy (`h-8 w-8 rounded-md bg-blue-500/10`)
  - Badge count overlay (same pattern as avatar badge count, line ~183) showing due count
  - Only renders when `dueCount > 0`
  - Tooltip: "Flashcard Reviews Due"
  - On click: smart navigation — single chapter → chapter flashcards, multiple → `/review/flashcards`

### `src/pages/Home.tsx`
- Remove `<ScheduledReviewAlert />` (no longer needed — header handles it globally)

### `src/components/review/ScheduledReviewAlert.tsx`
- Can be deleted or kept as unused — the header icon replaces its purpose

## Files

| File | Change |
|------|--------|
| `src/components/layout/MainLayout.tsx` | Add CalendarClock review button with badge for students |
| `src/pages/Home.tsx` | Remove ScheduledReviewAlert render |

