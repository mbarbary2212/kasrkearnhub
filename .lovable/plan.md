

# Unify Password Form Wording for New Accounts and Resets

## Problem

Both new account invitations and password resets lead to the same "Change Password" form. For a brand-new user, seeing "Change Password" is confusing since they haven't set one yet.

## Solution

Update the text on the password form to use neutral wording that works for both scenarios. No logic changes needed -- just text updates.

### Current vs New Wording

| Element | Current Text | New Text |
|---------|-------------|----------|
| Title | "Change Password" | "Set Your Password" |
| Subtitle | "Enter your new password below" | "Create a secure password for your account" |
| Success toast | "Password updated successfully!" | "Password set successfully!" |
| Error toast | "Failed to reset password" | "Failed to set password" |
| Signed-in button | "Change Password" | "Set Password" |

## File to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Update ~5 text strings on the password form (lines 378, 379, 232, 234, 461) |

## Why This Approach

- Zero risk of breaking the auth flow -- only display text changes
- Works naturally for both new users ("Set your password") and returning users ("Set your password" still makes sense for a reset)
- No new routes, no logic changes, no redirectTo changes

