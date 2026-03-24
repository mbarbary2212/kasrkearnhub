

# Fix: Tab Switch Causes Page Reset

## Problem
When you switch browser tabs and return, the entire page resets to the beginning. This happens because:

1. Supabase refreshes the auth token when the tab regains focus
2. The auth hook sets `isLoading: true` during token refresh
3. `ProtectedRoute` unmounts your entire page (ChapterPage, TopicDetailPage, etc.) and shows a loading spinner
4. When auth finishes, the page remounts from scratch — all your tab selections, scroll position, and practice progress are lost

## Solution
Distinguish between **initial auth loading** (user not yet known) and **background token refresh** (user already known). Only show the full-screen spinner for the initial load.

### Change in `src/hooks/useAuth.ts`
- Add a new state flag `initialLoading` (starts `true`, set to `false` after first session check completes, never goes back to `true`)
- Expose `initialLoading` instead of `isLoading` for route protection purposes
- Keep `isLoading` for components that need to know about data refresh, but don't let token refreshes set it to `true` when we already have a user

Specifically, in the `onAuthStateChange` handler (line 108-113), change:
```typescript
// BEFORE: sets isLoading true on every auth event
isLoading: !!session?.user,

// AFTER: only set isLoading true if we don't already have a user
isLoading: !!session?.user && !prev.user,
```

And add `initialLoading` tracking:
```typescript
// After first getSession() completes, set initialLoading = false
// This flag never goes back to true
```

### Change in `src/components/ProtectedRoute.tsx`
- Use the new `initialLoading` flag for the full-screen spinner gate instead of `isLoading`
- This means token refreshes won't unmount children

### Change in `src/contexts/AuthContext.tsx`
- Expose `initialLoading` from the auth context

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Add `initialLoading` flag; don't set `isLoading: true` on token refresh when user already exists |
| `src/contexts/AuthContext.tsx` | Expose `initialLoading` in context |
| `src/components/ProtectedRoute.tsx` | Use `initialLoading` instead of `isLoading` for the spinner gate |

## Impact
- No more page resets on tab switch
- Initial app load still shows spinner until auth is resolved
- Role checks still work correctly after token refresh
- All existing behavior preserved for first-time load and logout flows

