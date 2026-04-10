

## Problem

On page reload, there's a **race condition** between authentication and role loading:

1. `getSession()` restores the user immediately
2. `onAuthStateChange` fires but sees user already exists, so `isLoading` stays `false`
3. `fetchUserData` (which loads the role) hasn't completed yet
4. `ProtectedRoute` checks: user exists + not loading + no role yet → **denies access** and shows the "You don't have permission" toast
5. Role data arrives moments later, but the damage is done

## Fix

**File: `src/hooks/useAuth.ts`**
- Set `isLoading: true` when `fetchUserData` starts (not just on auth state change)
- Ensure `isLoading` remains `true` until the role is actually loaded, preventing `ProtectedRoute` from evaluating access prematurely

**File: `src/components/ProtectedRoute.tsx`**
- Add a guard: don't evaluate `shouldDeny` while `isLoading` is still true (belt-and-suspenders safety)
- This ensures the loading spinner shows until role data is confirmed

## Changes

1. **`useAuth.ts` (~line 87-96)**: At the start of `fetchUserData`, set `isLoading: true` so downstream consumers know role data is still pending. The existing code at line 131 (`isLoading: !!session?.user && !prev.user`) is insufficient because on reload the user is already set from `getSession()`.

2. **`ProtectedRoute.tsx` (~line 17)**: Change `shouldDeny` to also require `!isLoading` before denying — already does this, but `isLoading` isn't being set properly (root cause is in useAuth). No changes needed here since the fix in useAuth.ts is sufficient.

This eliminates the false permission denial on reload while keeping the security check intact once role data is loaded.

