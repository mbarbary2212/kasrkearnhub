

## Smart "Learning" Navigation When No Chapter Is Active

### Problem
When a student is outside a module/chapter context (e.g., on Customize Content, Settings, or Study Coach), clicking "Learning" in the sidebar just shows a toast saying "Select a module from the Dashboard." The student is stuck and can't get back to their learning content.

### Solution
Change the `handleNav` logic for the "Learning" item when outside a module context:

1. **If the student has a saved last position** (from `useLastPosition` hook) — navigate to that position using `buildResumeUrl()`. This acts like pressing "Continue where you left off."
2. **If no last position exists** — navigate to `/` (Dashboard), where they can pick a module.

No toast needed in either case — the action is immediate.

### Changes

**File: `src/components/layout/StudentSidebar.tsx`**

- Import `useLastPosition` and `buildResumeUrl` from `@/hooks/useLastPosition`
- Call `useLastPosition()` at the top of the component
- Replace the toast block (lines 157-159) with:
  ```
  if (lastPosition) {
    navigate(buildResumeUrl(lastPosition));
  } else {
    navigate('/');
  }
  ```
- Remove the `toast` import if no longer used elsewhere

### Files Changed
- `src/components/layout/StudentSidebar.tsx`

