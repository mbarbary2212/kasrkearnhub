
# Skip Landing Page - Direct to Login

## Current Flow (What You Want to Remove)
```
Non-logged-in user visits "/" 
    → Shows landing page with Student/Faculty cards (left screenshot)
    → User clicks "Student Login" or "Faculty Login"
    → Navigates to /auth?type=student (right screenshot)
```

## Proposed Flow (Direct Login)
```
Non-logged-in user visits "/"
    → Immediately redirects to /auth?type=student (the login form with toggle)

Logged-in user visits "/"
    → Shows year selection (LoggedInHome) - unchanged
```

## Implementation

**File to Modify: `src/pages/Home.tsx`**

Replace the entire non-logged-in landing page section (lines 88-295) with a simple redirect to `/auth?type=student`.

### Changes:

1. **Add `useEffect` to redirect non-logged-in users**
   - When `user` is null and `authLoading` is false, navigate to `/auth?type=student`
   - Use `{ replace: true }` to prevent back-button issues

2. **Remove the entire landing page JSX**
   - Delete lines 88-295 (the landing page for non-logged-in users)
   - Keep the loading skeleton during auth check

3. **Keep logged-in user flow intact**
   - The `LoggedInHome` component and auto-login logic remain unchanged
   - Year selection page still works exactly the same

### Code Change:

```tsx
// In Home.tsx - update the non-logged-in case

// If not logged in, redirect to auth page
if (!user && !authLoading) {
  navigate('/auth?type=student', { replace: true });
  return null;
}
```

**File to Modify: `src/pages/Auth.tsx`**

1. **Remove "Back to Home" button** (lines 447-454)
   - Since `/` now redirects to `/auth`, this button is no longer needed
   - It would create a redirect loop otherwise

### Safety Checks:

| Scenario | Current Behavior | New Behavior |
|----------|------------------|--------------|
| Non-logged-in user visits `/` | Shows landing page | Redirects to `/auth?type=student` |
| User logs in from `/auth` | `navigate('/')` goes to year selection | Same (works correctly) |
| Logged-in user visits `/` | Shows year selection | Same (unchanged) |
| User clicks back after login | Goes to landing | Goes to `/auth` (harmless - will redirect to `/`) |
| Auto-login to preferred year | Works | Works (unchanged) |

### Roles and Privileges:
This change does NOT affect roles or privileges because:
- The `type=student` URL parameter is purely cosmetic (changes button colors/icons only)
- User roles are fetched from `user_roles` table after authentication
- RLS policies enforce server-side security regardless of which login type was selected

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Add redirect for non-logged-in users, remove landing page JSX |
| `src/pages/Auth.tsx` | Remove "Back to Home" button to prevent redirect loop |

