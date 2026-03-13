

# Add Brevo Fallback to Email-Sending Edge Functions

Two edge functions send emails via Resend: `send-admin-email` and `provision-user`. Both need the Brevo fallback.

## Approach

### Helper function: `mapToBrevoPayload()`

A shared helper inside each function that maps the Resend-style fields to Brevo's expected shape:

```ts
function mapToBrevoPayload(params: {
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text?: string;
}) {
  return {
    sender: { name: 'SurgTeach', email: 'no-reply@kalmhub.com' },
    to: [{ email: params.toEmail, name: params.toName }],
    subject: params.subject,
    htmlContent: params.html,
    ...(params.text ? { textContent: params.text } : {}),
  };
}
```

### Fallback function: `sendWithBrevoFallback()`

Wraps the Resend call. If Resend returns 429, 403, or throws, logs a warning and retries via Brevo. If Brevo also fails, throws.

### Changes per file

**`supabase/functions/send-admin-email/index.ts`** (1 send site)
- Add `mapToBrevoPayload()` and `sendWithBrevoFallback()` at the top
- Replace the existing Resend fetch block (lines 161-183) with a call to `sendWithBrevoFallback()`
- Read `BREVO_API_KEY` from env alongside Resend keys

**`supabase/functions/provision-user/index.ts`** (2 send sites)
- Add the same two helpers at the top
- Replace the Resend fetch at lines 346-358 (password reset email) with `sendWithBrevoFallback()`
- Replace the Resend fetch at lines 587-601 (invitation email) with `sendWithBrevoFallback()`
- Read `BREVO_API_KEY` from env

### No other changes
- No new files, no DB changes, no frontend changes
- Existing Resend logic is preserved as the primary path; Brevo only fires on failure

