

# Fix: "Failed to send invite" — Mismatched Error Field Name

## Problem

The Sentry error "Failed to send invite" (3 events, 1 user, `/admin` page) is a **field name mismatch** between the edge function response and the client-side error handling.

When `inviteUser()` in `provision-user` fails (e.g., Resend rate limit + Brevo failure), the edge function returns:

```json
{ "success": false, "status": "error", "message": "Both Resend and Brevo failed..." }
```

But the client code reads `data?.error` (not `data?.message`), so it falls through to the generic string:

```typescript
// useAccessRequests.ts:74
throw new Error(data?.error || 'Failed to send invite');  // data.error is undefined!
```

The actual error reason is lost, and the admin sees a useless "Failed to send invite" toast.

The catch block (line 473-479) in the edge function **does** use `{ error: error.message }`, so top-level errors work fine. It's only the invite-single path (line 168-171) that spreads `InviteResult` which uses `message` instead of `error`.

## Fix

Two-sided fix — both client and server:

### 1. Edge function (`supabase/functions/provision-user/index.ts`)
Line 169 — include `error` field when invite fails:

```typescript
// Before
JSON.stringify({ success: result.status === 'success', ...result })

// After  
JSON.stringify({ 
  success: result.status === 'success', 
  error: result.status === 'error' ? result.message : undefined,
  ...result 
})
```

### 2. Client hooks (belt-and-suspenders — read both fields)

**`src/hooks/useAccessRequests.ts`** line 74:
```typescript
// Before
throw new Error(data?.error || 'Failed to send invite');
// After
throw new Error(data?.error || data?.message || 'Failed to send invite');
```

**`src/hooks/useUserProvisioning.ts`** line 32:
```typescript
// Before  
throw new Error(data?.error || 'Failed to send invite');
// After
throw new Error(data?.error || data?.message || 'Failed to send invite');
```

## Summary

| File | Change |
|------|--------|
| `provision-user/index.ts` | Add `error` field to invite-single response when status is 'error' |
| `useAccessRequests.ts` | Read `data?.message` as fallback |
| `useUserProvisioning.ts` | Read `data?.message` as fallback |

This ensures admins see the actual failure reason (e.g., "Both Resend and Brevo failed") instead of a generic message, making the issue actionable.

