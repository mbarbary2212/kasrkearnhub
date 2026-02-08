
# Email Invitations Tab Implementation Plan

## Summary

Add a third tab to the Accounts section called **"Email Invitations"** that displays all invitations sent via the single/bulk invite features. This tab will show:
- All sent invitations from `audit_log`
- Delivery status from `email_events`
- The ability to resend failed invitations

---

## Why Invitations Don't Appear in Requests (Clarification)

The current design has two separate flows:
1. **Access Requests**: Users submit a public form, admins approve/reject them
2. **Direct Invites**: Admins invite users directly (bypasses the request flow)

Currently, direct invites are only tracked in `audit_log`. This plan adds a dedicated UI to view them.

---

## Email Delivery Investigation Results

Your recent invites were sent successfully:
- `kokowawa@kokowawa.com` - User created, invite sent (Resend ID: `ecd9f66e-2baa`)
- `mohamed.elbarbary@rocketmail.com` - Existing user, password reset sent (Resend ID: `966c4d39-f493`)
  - **Delivery confirmed**: `email.delivered` event received at 20:41:23 UTC
  - Check your **Spam/Junk folder** in Yahoo Mail/Rocketmail

---

## Implementation Plan

### 1. Create New Hook: `useEmailInvitations`

**File:** `src/hooks/useEmailInvitations.ts`

This hook queries the `audit_log` table for `USER_INVITED` actions and joins with `email_events` for delivery status.

```typescript
// Query audit_log for USER_INVITED actions
// Return: email, full_name, role, invited_at, admin who sent it
// Cross-reference with email_events to get delivery status
```

**Data Structure:**
| Field | Source | Description |
|-------|--------|-------------|
| id | audit_log.id | Unique invitation ID |
| email | audit_log.metadata.email | Recipient email |
| full_name | audit_log.metadata.full_name | Recipient name |
| role | audit_log.metadata.role | Assigned role |
| is_new_user | audit_log.metadata.is_new_user | Was user newly created? |
| invited_at | audit_log.created_at | When invitation was sent |
| delivery_status | email_events.event_type | delivered/bounced/pending |
| bounce_reason | email_events.reason | If bounced, why |

---

### 2. Update AccountsTab: Add "Email Invitations" Tab

**File:** `src/components/admin/AccountsTab.tsx`

Add a third tab between "All Requests" and the header actions:

```
[Pending Requests (3)] [All Requests] [Email Invitations]
```

**Tab Content:**
- Table showing all sent invitations
- Columns: Name, Email, Role, Sent, Status, Actions
- Status badges: Delivered (green), Pending (yellow), Bounced (red)
- Actions: Resend button for failed/pending emails

---

### 3. Email Invitations Table Design

| Column | Content |
|--------|---------|
| **Name** | Recipient full name |
| **Email** | Email address with warning icon if bounced |
| **Role** | Badge showing assigned role |
| **Sent** | Date invitation was sent |
| **Status** | Delivered / Pending / Bounced badge |
| **Actions** | Resend button |

**Status Logic:**
- `delivered` in email_events → green "Delivered" badge
- `bounced` or `complained` → red "Failed" badge with reason tooltip
- No email_events record → yellow "Pending" badge (waiting for webhook)

---

### 4. Add Resend Functionality

Add a "Resend Invite" action that:
1. Calls the same `provision-user` Edge Function
2. Generates a new invite/recovery link
3. Sends a fresh email
4. Logs a new `USER_INVITED` entry in audit_log

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useEmailInvitations.ts` | Create | Hook to fetch invitation history with delivery status |
| `src/components/admin/AccountsTab.tsx` | Modify | Add third tab for Email Invitations |
| `src/hooks/useUserProvisioning.ts` | Modify | Add `useResendInvitation` hook for resending |

---

## Database Queries

### Get All Invitations with Delivery Status
```sql
SELECT 
  a.id,
  a.created_at as invited_at,
  a.metadata->>'email' as email,
  a.metadata->>'full_name' as full_name,
  a.metadata->>'role' as role,
  a.metadata->>'is_new_user' as is_new_user,
  e.event_type as delivery_status,
  e.reason as bounce_reason,
  e.created_at as delivery_at
FROM audit_log a
LEFT JOIN LATERAL (
  SELECT event_type, reason, created_at
  FROM email_events 
  WHERE to_email = LOWER(a.metadata->>'email')
  ORDER BY created_at DESC
  LIMIT 1
) e ON true
WHERE a.action = 'USER_INVITED'
ORDER BY a.created_at DESC
LIMIT 100;
```

---

## UI Mockup

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Account Management                        [⚠️ 1 Bounced] [Invite] [Bulk]│
│ Manage access requests and invite new users                            │
├─────────────────────────────────────────────────────────────────────────┤
│ [Pending Requests (0)] [All Requests] [📧 Email Invitations (5)]       │
├─────────────────────────────────────────────────────────────────────────┤
│ Email Invitations                                                       │
│ Track all invitation emails sent to users                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Name            │ Email                      │ Role    │ Sent    │Status│
│─────────────────┼────────────────────────────┼─────────┼─────────┼──────│
│ Mohamed Elbarbary│ m...@rocketmail.com       │ Student │ Today   │ ✓    │
│ Kokowawa        │ kokowawa@kokowawa.com      │ Student │ Today   │ ⏳   │
│ Amany Elramly   │ a...@yahoo.com             │ Dept    │ 2h ago  │ ✓    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Details

### useEmailInvitations Hook

```typescript
export function useEmailInvitations() {
  return useQuery({
    queryKey: ['email-invitations'],
    queryFn: async () => {
      // Get invitations from audit_log
      const { data: invitations, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('action', 'USER_INVITED')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get all unique emails
      const emails = invitations.map(i => i.metadata?.email?.toLowerCase()).filter(Boolean);

      // Get delivery status for these emails
      const { data: events } = await supabase
        .from('email_events')
        .select('*')
        .in('to_email', emails);

      // Create a map of latest event per email
      const eventMap = new Map();
      events?.forEach(e => {
        const existing = eventMap.get(e.to_email);
        if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
          eventMap.set(e.to_email, e);
        }
      });

      // Merge invitations with delivery status
      return invitations.map(inv => ({
        id: inv.id,
        email: inv.metadata?.email,
        full_name: inv.metadata?.full_name,
        role: inv.metadata?.role,
        is_new_user: inv.metadata?.is_new_user,
        invited_at: inv.created_at,
        actor_id: inv.actor_id,
        delivery: eventMap.get(inv.metadata?.email?.toLowerCase()) || null,
      }));
    },
  });
}
```

---

## Summary of Changes

1. **New hook** `useEmailInvitations.ts` to fetch invitation history
2. **Updated AccountsTab** with third "Email Invitations" tab
3. **Resend functionality** for failed deliveries
4. No database migration needed (uses existing `audit_log` and `email_events` tables)
