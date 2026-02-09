

# Fix Email Links and Differentiate Email Templates

## Summary

Two issues to address:
1. **localhost links** - Supabase uses Site URL (configured as localhost) as the base for auth links
2. **Wrong email content** - All emails say "access request approved" even for password resets and direct invites

---

## Issue 1: localhost Links

### Root Cause

The code correctly passes `redirectTo` (line 220):
```typescript
options: {
  redirectTo: `${publicAppUrl}/auth?view=change-password`,
}
```

But `generateLink()` returns an `action_link` whose **base domain** comes from the Supabase **Site URL** setting in the dashboard. The `redirectTo` only controls where users go *after* successful verification.

```text
Generated link structure:
http://localhost:3000/auth/v1/verify?token=xxx&redirect_to=https://www.kalmhub.com/auth...
      ↑                                              ↑
      Site URL (wrong)                              redirectTo (correct, but never reached)
```

### Solution (Manual - Dashboard Only)

No code changes needed. You must configure in Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://www.kalmhub.com`
3. Add to **Redirect URLs** (allowlist):
   - `https://www.kalmhub.com/**`

That's it - you do NOT need to add the Lovable published URL if you only want the custom domain.

---

## Issue 2: Differentiated Email Templates

### Current Problem

Lines 233-287 contain a single hardcoded email template that always says "your access request to KALM Hub has been approved" - even for password resets and direct invitations.

### Solution: Conditional Templates

I will update the Edge Function to generate different email content based on:

| Scenario | Condition | Subject | Message |
|----------|-----------|---------|---------|
| **Password Reset** | `isNewUser === false` | Reset your KALM Hub password | A password reset was requested for your account |
| **Access Approved** | `isNewUser === true` AND `source === 'access_request'` | Your KALM Hub access is approved | Your access request has been approved by the administration |
| **Direct Invitation** | `isNewUser === true` AND `source === 'direct'` | You're invited to KALM Hub | You have been invited to join KALM Hub |

### Code Changes

**File: `supabase/functions/provision-user/index.ts`**

Replace lines 232-287 with conditional logic:

```typescript
// Determine email content based on scenario
let emailSubject: string;
let emailHeading: string;
let emailIntro: string;
let emailAction: string;

if (!isNewUser) {
  // Existing user - password reset
  emailSubject = 'Reset your KALM Hub password';
  emailHeading = 'Password Reset';
  emailIntro = 'A password reset was requested for your account.';
  emailAction = 'Reset your password';
} else if (source === 'access_request') {
  // New user from approved access request
  emailSubject = 'Your KALM Hub access is approved — set your password';
  emailHeading = 'Welcome to KALM Hub';
  emailIntro = 'Your access request to KALM Hub has been approved by the administration.';
  emailAction = 'Set your password';
} else {
  // New user from direct invitation
  emailSubject = "You're invited to KALM Hub — set your password";
  emailHeading = 'Welcome to KALM Hub';
  emailIntro = 'You have been invited to join KALM Hub.';
  emailAction = 'Set your password';
}

// Build email HTML using these variables
const emailHtml = `...${emailHeading}...${emailIntro}...${emailAction}...`;
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/provision-user/index.ts` | Add conditional email templates based on `isNewUser` and `source` |

---

## After Implementation

### Manual Steps Required

1. **Update Supabase Dashboard:**
   - Authentication → URL Configuration
   - Site URL: `https://www.kalmhub.com`
   - Redirect URLs: `https://www.kalmhub.com/**`

2. **Resend to affected users:**
   - `mohamed.elbarbary@rocketmail.com` (password reset)
   - `amsnyelramly@yahoo.com`

### Expected Email Results

**Password Reset (mohamed.elbarbary@rocketmail.com):**
```
Subject: Reset your KALM Hub password

Hello Mohamed,

A password reset was requested for your account.

Click the button below to reset your password:

[Reset your password]
```

**Access Approved (new user from request):**
```
Subject: Your KALM Hub access is approved — set your password

Hello [Name],

Your access request to KALM Hub has been approved by the administration.

[Set your password]
```

**Direct Invitation (admin invites someone):**
```
Subject: You're invited to KALM Hub — set your password

Hello [Name],

You have been invited to join KALM Hub.

[Set your password]
```

