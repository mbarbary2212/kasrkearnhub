

# Scheduled Review System + UX Enhancements — Implementation Plan

## Overview
Add spaced repetition scheduling, mobile swipe gestures, fullscreen study mode, and a progress bar to the existing flashcard system. No existing flip/star/admin logic is modified.

---

## Step 1 — Database Migration

Create `scheduled_reviews` table referencing `study_resources(id)` with RLS, indexes, and unique constraint. Exactly as specified in the prompt — verified that `study_resources` table exists with uuid `id` column.

---

## Step 2 — `src/hooks/useScheduledReviews.ts` (NEW)

Six hooks using TanStack Query + Supabase:
- `useScheduleCard()` — toggle: insert 3 rows (1d/7d/30d) or delete pending rows
- `useDueReviews()` — fetch due cards joined with `study_resources` (gets `chapter_id`, content, title) and `module_chapters` (gets chapter title for breakdown tags)
- `useDueReviewCount()` — lightweight count for badge/alert
- `useUpcomingReviewCounts()` — counts by tomorrow/7d/30d
- `useMarkReviewsComplete()` — batch update `is_completed = true`
- `useIsCardScheduled(cardId)` — boolean check

Note: The `study_resources` table has `chapter_id` and `module_id` columns — these will be used for the smart navigation logic (single chapter vs multi-chapter routing).

---

## Step 3 — `src/hooks/useSwipeGesture.ts` (NEW)

Touch event hook with 50px threshold, vertical scroll protection. Attaches to a ref, fires `onSwipeLeft`/`onSwipeRight`.

---

## Step 4 — `src/hooks/useFullscreen.ts` (NEW)

Fullscreen API hook with webkit fallback. iOS Safari fallback via `kalmhub-fullscreen-overlay` CSS class (fixed, inset 0, z-9999). Syncs `isFullscreen` state via `fullscreenchange` events.

---

## Step 5 — `src/components/review/ScheduledReviewAlert.tsx` (NEW)

AlertDialog rendered in `Home.tsx` after login. If `useDueReviewCount() > 0`, shows alert with [Dismiss] and [Start Revision]. Smart navigation:
- Single chapter → `/module/{moduleId}/chapter/{chapterId}?section=resources&tab=flashcards`
- Multiple chapters → `/review/flashcards`

---

## Step 6 — `src/pages/FlashcardReviewPage.tsx` (NEW)

Route: `/review/flashcards`. Combined revision pile from all chapters. Features:
- Chapter breakdown tags in header
- Replicates the 3D flip CSS pattern (same classes: `perspective-1000`, `transform-style-3d`, `backface-hidden`, `rotate-y-180`) — does NOT import existing components
- Top bar: XCircle exit (left), Maximize2/Minimize2 fullscreen toggle (right)
- Floating "Exit Fullscreen" pill at bottom-center in fullscreen
- Progress bar below card
- Completion screen with next due date on finish

---

## Step 7 — `src/components/study/ScheduledReviewBanner.tsx` (NEW)

Banner for FlashcardsTab student view. Shows due count + "Start Revision" button + upcoming schedule counts. Same smart navigation logic.

---

## Step 8 — `src/components/study/FlashcardProgressBar.tsx` (NEW)

Simple component: progress bar + "Card X of Y" label. Props: `current`, `total`.

---

## Step 9 — Modify `FlashcardsStudentView.tsx`

Additive only (existing star at line 328-345 and flip logic untouched):
- Add `CalendarPlus`/`CalendarCheck` icon button next to star (line ~330 area, new sibling div)
- Attach `useSwipeGesture` to card container (the `div` at line 260)
- Replace plain text progress (line 375-378) with `<FlashcardProgressBar>`
- Add Maximize2/Minimize2 fullscreen button, `kalmhub-hide-nav` body class toggle, floating exit pill

---

## Step 10 — Modify `FlashcardsSlideshowMode.tsx`

Additive only:
- Same CalendarPlus/CalendarCheck next to star (line ~418 area)
- useSwipeGesture when paused
- Same fullscreen support as Step 9

---

## Step 11 — Modify `FlashcardsTab.tsx`

Add `<ScheduledReviewBanner />` at line ~217 (above mode selector), student view only (the section starting at line 216).

---

## Step 12 — Modify `Home.tsx`

Add `<ScheduledReviewAlert />` inside `LoggedInHome` component (after line ~108).

---

## Step 13 — Modify `App.tsx`

Add route: `<Route path="/review/flashcards" element={<FlashcardReviewPage />} />`
No separate auth guard needed — the app already redirects unauthenticated users from Home.

---

## Safety

Zero changes to: flip animations, star system, admin views, TTS, MCQ/SBA, clinical cases, tag system, `elevenlabs-tts`, `patient-history-chat`, `src/utils/tts.ts`.

