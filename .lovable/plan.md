

# Fix Password Reset / Invitation Link Flow

## Problems Identified

There are **three layered issues** preventing the email link from working:

### 1. Splash Screen Blocks Auth Pages
Every page load shows a full-screen splash that requires a click to dismiss (App.tsx line 60). When a user clicks an email link, they see the splash instead of the password form.

### 2. Expired Token Shows Login Form Instead of Error
The URL in your screenshot shows: `#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

When the token is expired, Supabase doesn't create a session (no `user`), and the `PASSWORD_RECOVERY` event never fires. The code at line 339 checks `authView === 'change-password' && user` -- since `user` is null, it falls through to the regular login form with no error message shown.

### 3. Valid Token Flow Still Broken by Splash
Even when a token IS valid, the splash screen appears first, delaying the auth flow and confusing users.

---

## Solution

### Fix 1: Skip Splash Screen on Auth Pages

In `App.tsx`, skip the splash screen when the URL path is `/auth` (meaning the user is arriving from an email link or navigating to login):

```typescript
const [showSplash, setShowSplash] = useState(() => {
  // Skip splash for auth pages (email links, login)
  return !window.location.pathname.startsWith('/auth');
});
```

### Fix 2: Handle Expired/Error Tokens Gracefully

In `Auth.tsx`, parse the URL hash fragment for errors and show appropriate messaging:

```typescript
// Parse hash fragment for auth errors (e.g., expired tokens)
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const authError = hashParams.get('error_description');
const errorCode = hashParams.get('error_code');
```

When `viewParam === 'change-password'` but there's an error (expired token), show a helpful message with a "Request new link" option instead of silently falling through to the login form.

### Fix 3: Show Password Form Without User Session

When `authView === 'change-password'` and there IS a valid session (PASSWORD_RECOVERY fired), show the password form. When there's an expired token error, show an error state with instructions. The current `reset` view (line 250) already has a password form that doesn't require a user -- we can reuse that pattern.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Skip splash screen when URL path starts with `/auth` |
| `src/pages/Auth.tsx` | Parse hash errors, show expired-link message, handle edge cases |

---

## Detailed Implementation

### App.tsx Change

```typescript
// Line 36 - change useState initial value
const [showSplash, setShowSplash] = useState(() => {
  // Don't show splash on auth pages (email links, direct login)
  return !window.location.pathname.startsWith('/auth');
});
```

### Auth.tsx Changes

**1. Parse hash errors (new code near line 42):**
```typescript
const viewParam = searchParams.get('view');

// Parse auth errors from hash fragment (e.g., expired tokens)
const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

useEffect(() => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const errorDescription = hashParams.get('error_description');
  const errorCode = hashParams.get('error_code');
  
  if (errorDescription && viewParam === 'change-password') {
    if (errorCode === 'otp_expired') {
      setAuthErrorMessage('This link has expired. Please request a new password reset link below.');
    } else {
      setAuthErrorMessage(errorDescription.replace(/\+/g, ' '));
    }
    // Show the login view with the error, not the change-password view
    setAuthView('login');
    setShowForgotPassword(true); // Open the forgot password section
  }
}, []);
```

**2. Show error alert in login form (in the login JSX):**
```typescript
{authErrorMessage && (
  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
    <p className="font-medium">Link Expired</p>
    <p>{authErrorMessage}</p>
  </div>
)}
```

**3. Keep the PASSWORD_RECOVERY handler for valid tokens (already in place at line 100)** -- this continues to work when the token is valid and Supabase fires the event.

---

## Expected Behavior After Fix

### Scenario 1: Valid Token (not expired)
1. User clicks email link
2. No splash screen (skipped for `/auth` path)
3. Supabase processes token, fires `PASSWORD_RECOVERY`
4. Password change form shown immediately

### Scenario 2: Expired Token
1. User clicks email link
2. No splash screen
3. Supabase redirects with `#error=otp_expired`
4. Auth page detects the error
5. Shows a clear "Link expired" message with the forgot password section open
6. User can immediately request a new reset link

### Scenario 3: Normal Login
1. User navigates to kalmhub.com
2. Splash screen shows as usual
3. Click to dismiss, login form appears

