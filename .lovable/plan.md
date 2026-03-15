

## Fix: Clear React Query cache on logout

### Problem
When user A logs out and user B logs in on the same device, user B sees user A's cached data for up to 5 minutes (`staleTime: 5 * 60 * 1000`). This is a privacy and data integrity issue because `signOut()` in `useAuth.ts` never clears the React Query cache.

### Change
**File:** `src/hooks/useAuth.ts`

1. Import `useQueryClient` from `@tanstack/react-query`
2. Inside the `useAuth` hook, call `const queryClient = useQueryClient()`
3. In the `onAuthStateChange` handler, when the session becomes null (user signed out), call `queryClient.clear()` to wipe all cached data
4. This goes in the existing `else` branch (around line 113) where we already reset auth state

This is the cleanest approach because it handles all sign-out paths (manual logout, token expiry, etc.) via the single `onAuthStateChange` listener rather than only in the explicit `signOut()` function.

### Risk
None. `queryClient.clear()` removes all queries from cache. Any mounted components will automatically refetch when the new user logs in and triggers re-renders.

