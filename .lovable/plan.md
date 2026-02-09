
# Combined Plan: Account Status Tracking + Remove Broken Email Icon

## Overview

Two improvements to the admin user management experience:
1. **Remove** the non-functional envelope (mail) icon from the Directory and Students tabs
2. **Add** an "Account Status" column to the Email Invitations table so you can see who has accepted their invitation

---

## Part 1: Remove Broken Email Reset Icon

The envelope icon in the Directory and Students tabs calls Supabase's built-in password reset, which doesn't work because the project uses Resend for emails. It will be removed entirely.

### Changes in `src/pages/AdminPage.tsx`
- Remove the `handleSendPasswordReset` function (lines 1243-1254)
- Remove the Mail icon button in the Directory tab (lines 1484-1493)
- Remove the Mail icon button in the Students tab (lines 1558-1567)
- Remove `Mail` from the lucide-react import (line 14)

---

## Part 2: Account Status Column in Email Invitations

### What You'll See

A new **"Account Status"** column in the Email Invitations table with three states:

| Badge | Meaning | Action Needed? |
|-------|---------|---------------|
| Gray "Not Registered" | User hasn't clicked the link or set a password | Yes -- resend or contact them |
| Blue "Registered" | User set their password but hasn't signed in | Maybe -- they may just not have needed it yet |
| Green "Active" | User has signed in (hover to see last sign-in date) | No -- they're good |

### How It Works

```text
Admin sends invite --> Email delivered? --> User clicked link & set password? --> User signed in?
     (existing)          (existing)              (NEW: confirmed_at)            (NEW: last_sign_in_at)
```

The system will call the server to check each invited user's authentication status (confirmed, last sign-in) and display it alongside the existing email delivery status.

### Technical Details

#### 1. Edge Function: `supabase/functions/provision-user/index.ts`

Add a new `check-invite-status` action that:
- Accepts a list of email addresses
- Looks up each in `auth.users` using the existing admin client
- Returns `confirmed_at` and `last_sign_in_at` per email
- Reuses the existing platform/super admin permission check

#### 2. Hook: `src/hooks/useEmailInvitations.ts`

- After fetching invitations, call the `check-invite-status` action with the list of emails
- Merge the account status into each invitation record
- Add `account_status` field (`not_registered` | `registered` | `active`) and `last_sign_in_at` to the `EmailInvitation` type

#### 3. UI: `src/components/admin/EmailInvitationsTable.tsx`

- Add an "Account Status" column between "Status" and "Actions"
- Render color-coded badges based on account status
- Add a tooltip on "Active" badges showing last sign-in date
- Make the column sortable like the existing columns

### Files Changed

| File | Change |
|------|--------|
| `src/pages/AdminPage.tsx` | Remove Mail icon buttons and unused function |
| `supabase/functions/provision-user/index.ts` | Add `check-invite-status` action |
| `src/hooks/useEmailInvitations.ts` | Fetch and merge account status data |
| `src/components/admin/EmailInvitationsTable.tsx` | Add Account Status column with badges |
