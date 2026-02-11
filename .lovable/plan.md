

# Fix: Lectures Not Appearing Immediately After Creation

## Root Cause

When a lecture is created, `useCreateChapter` invalidates the query key `['module-chapters', moduleId]`. However, the `BookLecturesView` component fetches its chapters with a different query key: `['module-chapters-for-book', moduleId, bookLabel]`. Since these keys don't match, the department's lecture list is never told to refetch, so the new lecture only appears after navigating away and back.

## Fix

### File: `src/hooks/useChapterManagement.ts`

Add invalidation of the book-specific query key in all three mutations (create, update, delete):

- **`useCreateChapter` (line 51)**: Add `queryClient.invalidateQueries({ queryKey: ['module-chapters-for-book', variables.moduleId] })`
- **`useUpdateChapter` (line 79)**: Add the same invalidation
- **`useDeleteChapter` (line 101)**: Add the same invalidation

By passing only the first two segments of the key (`['module-chapters-for-book', moduleId]`), React Query will match and invalidate all book variants for that module.

## Summary

| File | Change |
|------|--------|
| `src/hooks/useChapterManagement.ts` | Add `module-chapters-for-book` invalidation in create, update, and delete mutations |

This is a one-line addition in each of the three mutation hooks. No other files need changes.

