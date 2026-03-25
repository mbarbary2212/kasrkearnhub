

# Fix: Auto-Login to Preferred Year Not Working

## Root Cause

The `kalmhub:hasVisitedHome` sessionStorage flag is **never cleared on logout**. Since sessionStorage persists within the same browser tab across page reloads:

1. Student logs in → visits Home → `hasVisitedHome` is set → auto-redirect works ✓
2. Student logs out (MainLayout does `window.location.href = '/'` — same tab)
3. Student logs back in → visits Home → `hasVisitedHome` is **still set** → auto-redirect is **skipped** ✗

The guard on lines 41-45 of `Home.tsx` short-circuits the entire redirect logic after the first visit to Home in any browser session.

## Fix

### Step 1: Clear `hasVisitedHome` on logout

**File: `src/components/layout/MainLayout.tsx`** — In `handleLogout`, add `sessionStorage.removeItem('kalmhub:hasVisitedHome')` before the sign-out call.

**File: `src/pages/Auth.tsx`** — In the `signOut` function, also clear this flag (covers the blocked-user and password-reset sign-out paths).

### Step 2: Clear on sign-out from BlockedUserScreen

**File: `src/components/auth/BlockedUserScreen.tsx`** — Add the same `sessionStorage.removeItem` before `signOut`.

### Files Modified
- `src/components/layout/MainLayout.tsx` — 1 line added
- `src/pages/Auth.tsx` — 1 line added
- `src/components/auth/BlockedUserScreen.tsx` — 1 line added

