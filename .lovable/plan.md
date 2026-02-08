
# Separate Direct Invitations from Access Request Approvals

## Summary

Update the system to distinguish between **direct invitations** (from Invite User/Bulk Invite buttons) and **access request approvals** (when admins approve a user's request). This ensures the "Email Invitations" tab only shows proactive invites, not approval emails.

---

## Changes Required

### 1. Update Edge Function: `supabase/functions/provision-user/index.ts`

**What changes:**
- Accept an optional `source` parameter from the request body
- Pass this source to the `inviteUser` function
- Include `source` in the audit_log metadata

**Code changes:**

Line 82 - Extract source from request body:
```typescript
const { action, user, users, source } = await req.json();
```

Lines 89-97 - Pass source to inviteUser for single invite:
```typescript
const result = await inviteUser(
  supabaseAdmin, 
  user, 
  resendApiKey, 
  resendFromEmail, 
  resendReplyTo,
  publicAppUrl,
  caller.id,
  source || 'direct'  // Add source parameter
);
```

Lines 122-130 - Pass source to inviteUser for bulk invite:
```typescript
const result = await inviteUser(
  supabaseAdmin,
  u,
  resendApiKey,
  resendFromEmail,
  resendReplyTo,
  publicAppUrl,
  caller.id,
  source || 'direct'  // Add source parameter
);
```

Line 151 - Add source parameter to function signature:
```typescript
async function inviteUser(
  supabaseAdmin: any,
  user: UserToInvite,
  resendApiKey: string,
  resendFromEmail: string,
  resendReplyTo: string | undefined,
  publicAppUrl: string,
  adminId: string,
  source: string  // New parameter
): Promise<InviteResult>
```

Lines 328-340 - Include source in audit_log metadata:
```typescript
await supabaseAdmin.from('audit_log').insert({
  actor_id: adminId,
  action: 'USER_INVITED',
  entity_type: 'user',
  entity_id: userId,
  metadata: {
    email,
    full_name: fullName,
    role,
    is_new_user: isNewUser,
    link_type: linkType,
    source,  // Add source field
  },
});
```

---

### 2. Update Access Request Approval: `src/hooks/useAccessRequests.ts`

**What changes:**
- Add `source: 'access_request'` when calling provision-user during approval

**Code changes (lines 61-70):**
```typescript
const { data, error } = await supabase.functions.invoke('provision-user', {
  body: {
    action: 'invite-single',
    user: {
      email: request.email,
      full_name: request.full_name,
      role: role,
    },
    source: 'access_request',  // Mark as coming from access request
  },
});
```

---

### 3. Update Email Invitations Hook: `src/hooks/useEmailInvitations.ts`

**What changes:**
- Filter to only show invitations where `source === 'direct'` or `source` is undefined (backwards compatibility)

**Code changes (around line 44):**
```typescript
// Filter to only show direct invitations (not access request approvals)
const directInvitations = invitations.filter(inv => {
  const metadata = inv.metadata as Record<string, unknown> | null;
  const source = (metadata?.source as string) || 'direct';
  return source === 'direct';
});
```

Then use `directInvitations` instead of `invitations` in the mapping.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/provision-user/index.ts` | Accept `source` parameter, include in audit_log metadata |
| `src/hooks/useAccessRequests.ts` | Pass `source: 'access_request'` when approving requests |
| `src/hooks/useEmailInvitations.ts` | Filter to show only `source === 'direct'` invitations |

---

## Backwards Compatibility

Existing audit_log entries don't have a `source` field. The implementation treats missing `source` as `'direct'` so your existing invitation records will continue to appear in the Email Invitations tab.

---

## Result After Implementation

| Tab | Shows |
|-----|-------|
| **Pending Requests** | Users waiting for approval |
| **All Requests** | All access request submissions |
| **Email Invitations** | Only direct admin invites (Invite User / Bulk Invite buttons) |

Access request approval emails will be tracked in the audit_log with `source: 'access_request'` but won't appear in the Email Invitations tab.
