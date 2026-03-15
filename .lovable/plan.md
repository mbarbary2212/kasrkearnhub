

# Fix: Header CalendarClock Icon Click + Video Playback Loop

## Issue 1: CalendarClock (Flashcard Reviews Due) icon doesn't navigate

The icon in `MainLayout.tsx` (line 150) is a `Button` inside `TooltipTrigger asChild`. The code and structure look correct — `Button` uses `forwardRef`, so Radix should forward the click properly.

However, the `onClick` handler (line 151-162) calls `dueReviews?.length` which depends on the `useDueReviews` query. If that query hasn't resolved yet or returned `undefined`, the handler falls through to `navigate('/review/flashcards')` which should still work.

**Likely cause**: The user is already on a chapter flashcards page (`/module/.../chapter/...?section=resources&tab=flashcards`). When `dueReviews` loads and finds only one chapter (the same one), `navigate()` tries to go to the same URL — React Router treats this as a no-op since the path hasn't changed.

**Fix**: Add `{ replace: true }` or force a reload when navigating to the same route. Alternatively, always navigate to `/review/flashcards` from the header icon (simpler and more predictable behavior) since the smart routing is confusing when you're already on that chapter.

## Issue 2: Videos start and stop in a loop

In `YouTubePlayer.tsx` line 152, `event.target.unMute()` is called after seeking. Browser autoplay policy requires videos to stay muted for autoplay. Calling `unMute()` programmatically violates this policy, causing the browser to pause the video, which may trigger a retry loop.

**Fix**: Remove the `event.target.unMute()` call on line 152.

## Changes

| File | Change |
|------|--------|
| `MainLayout.tsx` | Simplify CalendarClock onClick to always navigate to `/review/flashcards` |
| `YouTubePlayer.tsx` | Remove `event.target.unMute()` from onReady handler |

