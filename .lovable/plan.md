
# Fix Resend Sender Domain Mismatch

## Problem Identified
The `RESEND_FROM_EMAIL` secret is currently set to use `kalmhub.com` (which is NOT verified in Resend), but your only verified domain is `feedback.kalmhub.com`.

## Solution

### Step 1: Update the RESEND_FROM_EMAIL Secret
Update the secret value from the current unverified sender to your verified subdomain:

| Secret | Current Value (likely) | New Value |
|--------|----------------------|-----------|
| `RESEND_FROM_EMAIL` | `noreply@kalmhub.com` | `KALM Hub <noreply@feedback.kalmhub.com>` |

The format `KALM Hub <noreply@feedback.kalmhub.com>` includes a friendly display name that will show as "KALM Hub" in the recipient's inbox.

### Step 2: Add Debugging Logs to Edge Function
Add a log line before the Resend API call to make troubleshooting easier in the future:

```typescript
// Before the fetch call:
console.log(`Sending email via Resend - From: ${resendFromEmail}, To: ${email}`);
```

And after the response:
```typescript
console.log(`Resend API response status: ${resendResponse.status}`);
```

### Step 3: Redeploy and Test

After updating the secret and code:
1. Redeploy the edge function
2. Test the Approve button again
3. Check edge function logs to verify the correct sender is being used

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/provision-user/index.ts` | Add debugging log lines before/after Resend API call |

## Secret to Update

| Secret | Action |
|--------|--------|
| `RESEND_FROM_EMAIL` | Update value to `KALM Hub <noreply@feedback.kalmhub.com>` |

## Why This Fixes It
- Resend requires the sender email domain to be verified
- Your verified domain is `feedback.kalmhub.com`, not `kalmhub.com`
- Using `noreply@feedback.kalmhub.com` will pass Resend's domain verification check
