

# Redesign User Management: Full Controls in Directory, Clean Analytics

## Overview

Centralize all user management controls (edit email, reset password, set temporary password, suspend, deactivate, delete) into the Directory tab. Strip the Analytics tab down to read-only data. Add alphabetical sorting and status badges to the Directory.

## Changes Summary

### 1. Directory Tab -- Full Control Hub (AdminPage.tsx)

- Add **alphabetical sort toggle** (A-Z / Z-A by name, default A-Z)
- Add **status badge** per user (Active / Suspended / Deactivated)
- Replace the single password button with a **three-dot action menu** per user containing:
  - **Edit Email** -- opens new dialog to update email
  - **Set Temporary Password** -- existing SetPasswordDialog (super admin only)
  - **Reset Password** -- sends a password reset email via provision-user (platform admin+)
  - Separator
  - **Suspend User** / **Lift Suspension** (contextual based on status)
  - **Deactivate Account** / **Restore Account** (contextual based on status)
  - Separator
  - **Delete User** (super admin only, red text, two-step: soft-delete first, then hard-delete option)

### 2. Analytics Tab -- Read-Only (UserAnalyticsTab.tsx)

- Remove the three-dot dropdown menu with suspend/deactivate/restore actions
- Remove `UserActionModal` usage and related state
- Remove unused imports (`useUserAdminActions`, `Ban`, `UserX`, `UserCheck`, `MoreHorizontal`)
- Keep: search, status filter, sort, stats summary, and all analytics columns

### 3. New Component: EditEmailDialog

- Dialog with current email shown (read-only) and new email input field
- Calls `provision-user` edge function with new `update-email` action
- Platform admin+ required

### 4. New Component: DeleteUserDialog

- Two-step confirmation dialog:
  - **Step 1 (Soft Delete)**: Deactivates the account (sets status to 'removed') -- reversible
  - **Step 2 (Hard Delete)**: Permanently removes the user from auth.users -- irreversible, super admin only
- Shows clear warnings about each step
- Requires typing "DELETE" to confirm hard delete

### 5. Edge Function Updates (provision-user/index.ts)

Add three new actions:

- **`update-email`**: Updates user email in auth.users and profiles table. Requires platform_admin+.
- **`reset-password`**: Generates a recovery link and sends password reset email via Resend. Requires platform_admin+.
- **`delete-user`**: Two modes:
  - `soft`: Sets profile status to 'removed' via existing admin_remove_user RPC
  - `hard`: Calls `supabase.auth.admin.deleteUser()` to permanently remove. Super admin only. Logs to admin_actions.

### 6. Profile Type Update (database.ts)

Add `status`, `banned_until`, `status_reason` fields to the `Profile` interface so the Directory tab can show status badges without a separate query.

## Technical Details

### Files to Create
- `src/components/admin/EditEmailDialog.tsx`
- `src/components/admin/DeleteUserDialog.tsx`

### Files to Modify
- `src/pages/AdminPage.tsx` -- Directory sub-tab: add sort, status badges, three-dot menu with all actions
- `src/components/admin/UserAnalyticsTab.tsx` -- remove action controls, keep analytics only
- `src/hooks/useUserAdminActions.ts` -- add `resetPassword` and `deleteUser` mutations
- `supabase/functions/provision-user/index.ts` -- add `update-email`, `reset-password`, `delete-user` actions
- `src/types/database.ts` -- extend Profile interface with status fields

### Directory Action Menu Structure

```text
[Edit Email]
[Set Temporary Password]        (super admin only)
[Reset Password]                (sends email)
---
[Suspend User]                  (if active)
[Lift Suspension]               (if suspended)
[Deactivate Account]            (if active/suspended)
[Restore Account]               (if deactivated)
---
[Delete User]                   (super admin only, red)
```

### Delete Flow

```text
User clicks "Delete User"
  -> DeleteUserDialog opens
  -> Step 1: "Deactivate first" (soft delete)
     -> Sets status='removed' in profiles
     -> User can still be restored
  -> Step 2: "Permanently delete" (hard delete)
     -> Requires typing "DELETE" to confirm
     -> Calls auth.admin.deleteUser()
     -> Profile cascade-deleted
     -> Irreversible
```

### Edge Function Security
- `update-email`: platform_admin or super_admin
- `reset-password`: platform_admin or super_admin
- `delete-user` (soft): platform_admin or super_admin
- `delete-user` (hard): super_admin only

