

## Fix: Permission Toast Firing During Loading

### Root Cause

In `ProtectedRoute.tsx`, line 17:
```typescript
const shouldDeny = !isLoading && user && requiredRole && !hasRole(requiredRole);
```

This does NOT check `initialLoading`. During hard refresh, there's a brief state where:
- `initialLoading: true` (fetchUserData hasn't completed, role is null)
- `isLoading: false` (set by `onAuthStateChange` when prev.user exists)
- `user` is set, `role` is null

The JSX correctly returns the spinner (line 26 checks `initialLoading`), but `shouldDeny` evaluates to `true`, and the `useEffect` on line 19 fires the toast anyway.

### Fix (1 file)

**`src/components/ProtectedRoute.tsx`** — Add `initialLoading` to the `shouldDeny` guard:

```typescript
const shouldDeny = !isLoading && !initialLoading && user && requiredRole && !hasRole(requiredRole);
```

This ensures the toast and redirect logic only activate after both auth session AND role data have fully loaded. No other files need changes.

