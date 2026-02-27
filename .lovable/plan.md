

## Plan: Skip Splash Screen for Logged-In Users

### Problem
The splash screen shows on every page refresh, even for authenticated users. This makes it look like they've been logged out when they haven't.

### Fix

**In `src/App.tsx`** — update the `showSplash` initializer to also check for an existing Supabase session in localStorage:

```typescript
const [showSplash, setShowSplash] = useState(() => {
  if (window.location.pathname.startsWith('/auth')) return false;
  // Skip splash if user already has a session stored
  const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (storageKey && localStorage.getItem(storageKey)) return false;
  return true;
});
```

This is a synchronous check of localStorage (no async needed) — if a Supabase auth token exists, the user was previously logged in and the splash is skipped. First-time visitors and logged-out users still see it.

### Files
| File | Change |
|------|--------|
| `src/App.tsx` | Update `showSplash` initializer to skip when session exists in localStorage |

One file, ~3 lines changed.

