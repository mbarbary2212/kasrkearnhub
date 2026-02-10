
# Compact Login Screen -- Remove Large Logo, Add Small Inline Logo

## What Changes

Remove the large KALM Hub logo block from the top of the login card and instead place a small logo icon (using `kalm-logo-icon.png`) inline beside the "Welcome" heading.

This eliminates ~150px of vertical space so all important elements (email, password, sign in, forgot password, request access) are visible without scrolling on mobile.

## Affected Views

The large logo appears in **5 places** inside `src/pages/Auth.tsx`:
1. Main login form (line 482-484)
2. Reset password view (line 289-291)
3. Change password view (line 375-377)
4. Already signed-in view (line 449-451)
5. Access request form layout (no logo there, already clean)

All four logo blocks will be removed and replaced with a small inline icon beside the title text.

## Technical Details

### File: `src/pages/Auth.tsx`

**Import change (line 14):**
- Change from importing `kalm-hub-logo.png` to `kalm-logo-icon.png`

**Main login form (lines 482-486):**
- Remove the 3-line logo `div` block
- Replace `<CardTitle>Welcome</CardTitle>` with a flex row containing the small logo icon (h-8) and "Welcome" text side by side

**Reset password view (lines 289-293):**
- Remove the logo block
- Add small icon beside "Set New Password" title

**Change password view (lines 375-379):**
- Remove the logo block
- Add small icon beside "Set Your Password" title

**Already signed-in view (lines 449-452):**
- Remove the logo block
- Add small icon beside "You're signed in" title

### Visual Result

Before:
```text
  [  Large Logo + Text Block  ]
       
       Welcome
   Sign in to KALM Hub
   [Student] [Faculty]
   Email: ...
   Password: ...
   [Sign In]
   -- scrolling needed --
   Forgot password?
   Request Access
```

After:
```text
   [icon] Welcome
   Sign in to KALM Hub
   [Student] [Faculty]
   Email: ...
   Password: ...
   [Sign In]
   Forgot password?
   Request Access
```
