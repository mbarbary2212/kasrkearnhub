
# Resume Last In-App Page Implementation

## Overview
Implement session persistence so logged-in users automatically resume at their last visited page after browser refresh, while preserving the existing preferred-year auto-login as a fallback.

## How It Works

```text
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER REFRESH FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User refreshes browser                                         │
│         │                                                       │
│         ▼                                                       │
│  Vercel serves index.html (SPA fallback - unchanged)            │
│         │                                                       │
│         ▼                                                       │
│  App loads at "/" (landing)                                     │
│         │                                                       │
│         ▼                                                       │
│  Auth check: Is user logged in?                                 │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    │         │                                                  │
│   NO        YES                                                 │
│    │         │                                                  │
│    ▼         ▼                                                  │
│ Redirect  Check localStorage for lastPath                      │
│ to /auth       │                                                │
│            ┌───┴───┐                                            │
│            │       │                                            │
│         EXISTS   EMPTY                                          │
│            │       │                                            │
│            ▼       ▼                                            │
│      Validate   Fall back to                                    │
│      & resume   preferred year                                  │
│      lastPath   auto-login                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Routes to Track

**Store in localStorage:**
- `/year/*` - Year pages
- `/module/*` - Module and chapter pages
- `/progress` - Study coach/progress page
- `/account` - User account settings
- `/admin/*` - Admin pages (only for admin users)
- `/virtual-patient/*` - Virtual patient sessions
- `/feedback` - Feedback page

**Never store:**
- `/` - Landing/home page
- `/auth*` - Authentication pages

## Implementation

### 1. Create Route Persistence Hook
**New file: `src/hooks/useRouteResume.ts`**

This hook handles:
- **Tracking**: Saves current path to localStorage on every navigation
- **Restoration**: Returns the saved path for redirect logic
- **Validation**: Checks if saved path is valid for the user's role
- **Cleanup**: Clears stored path on logout

```typescript
// Key functionality:
const STORAGE_KEY = 'kalmhub:lastPath';

// Which routes to track
const RESUMABLE_ROUTES = ['/year', '/module', '/progress', '/account', '/virtual-patient', '/feedback'];
const ADMIN_ROUTES = ['/admin'];

// Save path on navigation
useEffect(() => {
  if (shouldTrackRoute(pathname)) {
    localStorage.setItem(STORAGE_KEY, pathname + search);
  }
}, [pathname, search]);

// Clear on logout
export function clearLastPath() {
  localStorage.removeItem(STORAGE_KEY);
}
```

### 2. Integrate with Home Page
**Modify: `src/pages/Home.tsx`**

Update the auto-login logic to check for `lastPath` first:

```typescript
// Current priority order:
// 1. Skip if user explicitly navigated home (skipAutoLogin flag)
// 2. NEW: Check localStorage for lastPath → redirect if valid
// 3. Check preferred_year_id + auto_login_to_year → redirect to year
// 4. Show year selection page
```

### 3. Integrate with Auth Page
**Modify: `src/pages/Auth.tsx`**

After successful login, check for stored path:

```typescript
// In handleLogin success:
const lastPath = localStorage.getItem('kalmhub:lastPath');
if (lastPath && isValidPath(lastPath)) {
  navigate(lastPath);
} else {
  navigate('/');  // Goes through Home.tsx auto-login logic
}
```

### 4. Clear on Logout
**Modify: `src/components/layout/MainLayout.tsx`**

Add cleanup in the logout handler:

```typescript
const handleLogout = async () => {
  clearLastPath();  // Clear stored route
  await signOut();
  navigate('/');
};
```

Also clear in `src/pages/Auth.tsx` signOut function.

## Safety Features

| Scenario | Handling |
|----------|----------|
| User is not admin but lastPath is `/admin/*` | Ignore lastPath, fall back to preferred year |
| lastPath points to deleted content | React Query will show "not found" UI gracefully |
| Redirect loop prevention | Don't redirect if already on the target path |
| User explicitly clicks Home | `skipAutoLogin` flag bypasses resume logic |

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useRouteResume.ts` | **Create** | Core hook for tracking and restoring routes |
| `src/pages/Home.tsx` | **Modify** | Add lastPath check before preferred-year logic |
| `src/pages/Auth.tsx` | **Modify** | Redirect to lastPath after login, clear on signOut |
| `src/components/layout/MainLayout.tsx` | **Modify** | Clear lastPath on logout |

## Technical Details

### localStorage Key
```
kalmhub:lastPath = "/module/abc123/chapter/xyz789"
```

### Route Validation
```typescript
function isValidResumePath(path: string, isAdmin: boolean): boolean {
  // Check if path matches resumable patterns
  const isResumable = RESUMABLE_ROUTES.some(r => path.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some(r => path.startsWith(r));
  
  // Admin routes only valid for admins
  if (isAdminRoute && !isAdmin) return false;
  
  return isResumable || isAdminRoute;
}
```

### Integration with Existing Auto-Login
The existing `preferred_year_id` + `auto_login_to_year` feature becomes the fallback when no `lastPath` exists. This preserves the user's preference for fresh sessions while adding resume capability for interrupted sessions.
