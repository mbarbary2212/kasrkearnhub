
# Authentication Overhaul - Full Correction Plan

## Summary

This plan addresses all non-negotiable requirements by correcting the password policy, removing temporary password distribution, and implementing Resend-based email invites for user provisioning.

---

## Current State Analysis

| Area | Current State | Required State |
|------|--------------|----------------|
| Password length | `minLength={6}`, validation: `< 6` | `minLength={8}`, max 64, no complexity requirements |
| Password complexity | None enforced (but should display recommendation) | Recommend only, not require |
| Auth tabs | "Sign In" / "Create Account" tabs exist | Single login form, no Create Account |
| User provisioning | Not implemented | Admin sends invite via Resend, user sets own password |
| Bulk upload | Not implemented | Names + emails only, send invites via Resend |
| Edge function | `manage-test-user` (test only, 12 char) | New `provision-user` with Resend integration |
| Secrets | Only `OPENAI_API_KEY` exists | Need `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `PUBLIC_APP_URL` |

---

## Phase 1: Password Policy Correction

### A1. Create PasswordRequirements Component

**New File: `src/components/auth/PasswordRequirements.tsx`**

Creates a simple component that displays:
- "Recommended: 8-64 characters. Using a number and symbol can improve strength."
- Optional live mode shows checkmarks as recommendations (not requirements)
- Uses `text-xs text-muted-foreground` styling

### A2. Update Auth.tsx

**File: `src/pages/Auth.tsx`**

Changes:
1. Remove Create Account tab (lines 489-493 TabsList, lines 567-633 signup form)
2. Remove `handleSignup` function (lines 121-143)
3. Remove `isAllowedEmailDomain` function (lines 113-119)
4. Change all `minLength={6}` to `minLength={8}` (lines 244, 260, 389, 405, 613)
5. Update validation in `handleResetPassword` (line 174): change from `< 6` to `< 8` and add `> 64` check
6. Remove number/symbol enforcement (none exists currently, but prevent future addition)
7. Update forgot password success message (line 154-155) to generic: "If this email is registered, you will receive a reset link shortly."
8. Add PasswordRequirements component under password inputs
9. Convert forgot password to inline collapsible section (remove separate view)

### A3. Update AccountPage.tsx

**File: `src/pages/AccountPage.tsx`**

Changes:
1. Update validation (line 197): change from `< 6` to `< 8` and add `> 64` check
2. Update error message (line 198): "Password must be 8-64 characters"
3. Add PasswordRequirements component under password input

---

## Phase 2: Access Request System

### B1. Database Migration

Create `access_requests` table:

```sql
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_title TEXT,
  request_type TEXT DEFAULT 'student',
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_access_requests_email_pending 
ON public.access_requests(email) 
WHERE status = 'pending';

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage access requests"
ON public.access_requests
FOR SELECT, UPDATE, DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('platform_admin', 'super_admin')
  )
);
```

### B2. Create AccessRequestForm Component

**New File: `src/components/auth/AccessRequestForm.tsx`**

Form fields:
- Full Name (required)
- Email (required)
- Job Title (optional)
- Request Type: Student / Faculty (radio)

On submit: Insert to `access_requests`, show success message.

### B3. Update Auth.tsx - Add Request Access

Add `authView` value: `'request-access'`
Add "Need access? Request an account" link below login form.
When clicked, show AccessRequestForm.

---

## Phase 3: Admin Accounts Tab

### C1. Create AccountsTab Component

**New File: `src/components/admin/AccountsTab.tsx`**

Sub-tabs:
1. **Pending Requests** - List access requests with Approve/Reject
2. **Bulk Upload** - CSV upload for names + emails only

**Approve Flow:**
1. Admin clicks "Approve" on a pending request
2. Call `provision-user` edge function with `action: "invite-single"`
3. Function creates user (if needed) + sends Resend email with password setup link
4. Request marked as approved

**NO temporary passwords anywhere.**

### C2. Create BulkUserUploadModal Component

**New File: `src/components/admin/BulkUserUploadModal.tsx`**

Features:
- Drag & drop CSV/Excel
- Columns accepted: `full_name`, `email`, `role` (optional), `request_type` (optional)
- **NO password column**
- Preview before submission
- "Create Users + Send Invites" button
- Results CSV columns: `email`, `status`, `message`, `invited_at` (NO passwords)

### C3. Update AdminPage.tsx

Add Accounts tab for Platform/Super Admins:

```tsx
{(isSuperAdmin || isPlatformAdmin) && (
  <TabsTrigger value="accounts" className="gap-2 ...">
    <UserPlus className="w-4 h-4" />
    Accounts
  </TabsTrigger>
)}

{(isSuperAdmin || isPlatformAdmin) && (
  <TabsContent value="accounts">
    <AccountsTab />
  </TabsContent>
)}
```

---

## Phase 4: Edge Function - provision-user

### D1. Create provision-user Edge Function

**New File: `supabase/functions/provision-user/index.ts`**

**Actions:**
- `invite-single`: Create/find user + send invite email
- `invite-bulk`: Process array of users

**For each user:**
1. Verify caller is `platform_admin` or `super_admin` (check `user_roles` for `auth.uid()`)
2. Check if user exists by email using Admin API
3. If not exists: Create user with `admin.createUser({ email, email_confirm: false })`
4. Generate password setup link using `admin.generateLink({ type: 'recovery', email })`
5. Send email via Resend API with the link
6. Log to `audit_log`
7. Return per-user results

**Email Template:**

Subject: "Set your password for KALM Hub"

Text body:
```
Hello {{name}},
You've been invited to access KALM Hub.
Set your password using this link:
{{invite_link}}

If you did not expect this email, you can ignore it.
— KALM Hub Team
```

HTML body:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 20px;">
  <h1 style="color: #333;">You're invited to KALM Hub</h1>
  <p>Hello {{name}},</p>
  <p>You've been invited to access KALM Hub.</p>
  <p>
    <a href="{{invite_link}}" 
       style="display: inline-block; padding: 12px 24px; 
              background-color: #4f46e5; color: white; 
              text-decoration: none; border-radius: 6px;">
      Set your password
    </a>
  </p>
  <p style="margin-top: 20px; font-size: 12px; color: #666;">
    Or copy this link: {{invite_link}}
  </p>
  <p style="margin-top: 20px; font-size: 12px; color: #666;">
    If you did not expect this email, you can ignore it.
  </p>
  <p>— KALM Hub Team</p>
</body>
</html>
```

**Required Environment Variables:**
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (e.g., "KALM Hub <no-reply@kalmhub.com>")
- `RESEND_REPLY_TO` (e.g., "mohamed.elbarbary@gmail.com")
- `PUBLIC_APP_URL` (e.g., "https://www.kalmhub.com")

### D2. Update supabase/config.toml

Add:
```toml
[functions.provision-user]
verify_jwt = false
```

---

## Phase 5: Required Secrets

Before implementation, the following secrets must be configured:

| Secret | Example Value | Purpose |
|--------|---------------|---------|
| `RESEND_API_KEY` | `re_xxxxx...` | Resend API authentication |
| `RESEND_FROM_EMAIL` | `KALM Hub <no-reply@kalmhub.com>` | Sender address (must be verified domain) |
| `RESEND_REPLY_TO` | `mohamed.elbarbary@gmail.com` | Reply-to address for monitoring |
| `PUBLIC_APP_URL` | `https://www.kalmhub.com` | Base URL for invite links |

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/PasswordRequirements.tsx` | Password recommendation display |
| `src/components/auth/AccessRequestForm.tsx` | Access request form |
| `src/components/admin/AccountsTab.tsx` | Admin user provisioning tab |
| `src/components/admin/BulkUserUploadModal.tsx` | CSV/Excel bulk invite upload |
| `src/hooks/useAccessRequests.ts` | Access request CRUD hook |
| `src/hooks/useUserProvisioning.ts` | User invite hook |
| `supabase/functions/provision-user/index.ts` | User provisioning + Resend email |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Remove signup tab, fix password validation (8-64), inline forgot password, add request access, add PasswordRequirements |
| `src/pages/AccountPage.tsx` | Fix password validation (8-64), add PasswordRequirements |
| `src/pages/AdminPage.tsx` | Add Accounts tab |
| `supabase/config.toml` | Add provision-user function |

### Database Migration

| Change | Description |
|--------|-------------|
| Create `access_requests` table | Store pending access requests |
| Add RLS policies | Public INSERT, admin SELECT/UPDATE/DELETE |

---

## Validation Checklist

After implementation, confirm:

- [ ] Password policy is 8-64 length-only everywhere
- [ ] No number/symbol requirements remain enforced (only recommended)
- [ ] No temporary passwords are generated or exported
- [ ] Bulk upload accepts only names + emails (no password column)
- [ ] Invites are sent via Resend from the Edge Function
- [ ] Reply-To header is included in emails
- [ ] Create Account tab is removed from Auth page
- [ ] Forgot password shows generic success message
- [ ] Access request form works for new users
- [ ] Accounts tab appears for Platform/Super Admins only

---

## User Experience Flows

### New User Requesting Access:
1. Home → Click "Student Login"
2. See login form → Click "Need access? Request an account"
3. Fill request form → Submit
4. See: "Request submitted. You'll receive email when approved."
5. Admin approves → User receives Resend email with "Set your password" link
6. User clicks link → Sets own password (8-64 chars) → Full access

### Admin Bulk Invite:
1. Admin Panel → Accounts → Bulk Upload
2. Download CSV template (columns: full_name, email, role)
3. Fill in users
4. Upload → Preview
5. Click "Create Users + Send Invites"
6. Download results CSV (email, status, message, invited_at) - NO passwords
7. Users receive Resend emails and set their own passwords
