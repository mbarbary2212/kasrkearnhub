

# Fix: YouTube Player Infinite Re-creation Loop

## Root Cause

In `YouTubePlayer.tsx`, the main `useEffect` (line 113-219) has `onReady` in its dependency array. The parent (`LectureList.tsx` line 644) passes `onReady` as an inline arrow function: `() => setIsPlayerReady(true)`. 

Every parent re-render creates a new function reference for `onReady`, which triggers the `useEffect` cleanup (destroying the player) and re-initialization (creating a new player). This cascades because the new player fires events that cause state changes in the parent, triggering another re-render, creating another new `onReady`, destroying and recreating again — an infinite loop.

The `onTimeUpdate` callback already uses the ref pattern correctly (line 76-77) to avoid this exact problem. `onReady` just needs the same treatment.

## Fix

**File: `src/components/content/YouTubePlayer.tsx`**

1. Add a ref for `onReady` (like the existing `onTimeUpdateRef` pattern):
   ```typescript
   const onReadyRef = useRef(onReady);
   onReadyRef.current = onReady;
   ```

2. Use `onReadyRef.current?.()` instead of `onReady?.()` inside the effect

3. Remove `onReady` from the `useEffect` dependency array

Single file change, 3 lines modified.

