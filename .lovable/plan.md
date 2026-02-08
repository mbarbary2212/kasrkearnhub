
# Improve Email Deliverability and UI Messaging

## Overview
Enhance the account approval/invitation flow with better email content and spam prevention guidance for users and admins.

## Changes

### 1. Update Invitation Email Template
**File:** `supabase/functions/provision-user/index.ts`

Improve the HTML/plain-text email with:
- Clear explanation of why the user is receiving the email
- Academic tone with KALM Hub branding
- Professional footer identifying the platform
- Keep existing logging (already implemented)

**New Email Content:**

```html
Subject: "Your KALM Hub access is approved — set your password"

<h1>Welcome to KALM Hub</h1>
<p>Hello [Name],</p>
<p>You are receiving this email because your access request to KALM Hub 
   has been approved by the administration.</p>
<p>Click below to set your password and activate your account:</p>
[Set your password button]
<p>Or copy this link: [link]</p>
<hr>
<p>If you did not request this, you can safely ignore this email.</p>
<p style="text-align:center">
  KALM Hub — Kasr Al-Ainy Learning & Mentorship Hub
</p>
```

### 2. Add Spam Notice to Access Request Success Screen
**File:** `src/components/auth/AccessRequestForm.tsx`

After the success message ("You'll receive an email when your account is approved"), add:

> "If you don't receive the email within a few minutes, please check your Spam or Junk folder and mark it as 'Not Spam'."

### 3. Add Spam Notice to Admin Approve Dialog
**File:** `src/components/admin/AccountsTab.tsx`

Update the success toast message when approval completes to include:

> "Invite sent. Ask the user to check Spam/Junk if it doesn't arrive within a few minutes."

### 4. Redeploy Edge Function
After updating the email template, redeploy `provision-user` to apply changes.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/provision-user/index.ts` | Update email HTML/text with academic branding and approval explanation |
| `src/components/auth/AccessRequestForm.tsx` | Add spam folder notice to success screen |
| `src/components/admin/AccountsTab.tsx` | Update approval success toast with spam guidance |

---

## Technical Details

### Email Template Update (provision-user/index.ts)

**Subject line change:**
```typescript
// From:
subject: 'Set your password for KALM Hub'
// To:
subject: 'Your KALM Hub access is approved — set your password'
```

**HTML body key sections:**
- Greeting with user's name
- Explanation: "You are receiving this email because your access request to KALM Hub has been approved by the administration."
- Single CTA button: "Set your password"
- Plain-text link fallback
- Footer: "KALM Hub — Kasr Al-Ainy Learning & Mentorship Hub"

### UI Changes

**AccessRequestForm.tsx success screen:**
Add a subtle muted text note below the existing message about checking spam folders.

**AccountsTab.tsx approval success:**
The existing hook uses `toast.success()` — update the message in `useAccessRequests.ts` or inline override.

---

## What We Are NOT Changing
- No mailto: logic
- No changes to feedback or questions system
- Keeping existing RESEND_FROM_EMAIL secret value (already configured)
- Keeping existing logging (already in place)
