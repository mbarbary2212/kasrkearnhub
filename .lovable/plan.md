# Remove Brevo Fallback — Resend Only

Now that `feedback.kalmhub.com` is verified in Resend, we remove the Brevo fallback code so email failures surface the real Resend error directly (instead of being masked by a fallback that also fails).

## What changes

### 1. `supabase/functions/send-admin-email/index.ts`
- Delete `mapToBrevoPayload()` helper.
- Replace `sendWithBrevoFallback()` with a simple `sendWithResend()` that POSTs to Resend and throws on non-OK with the Resend error text.
- Update the call site to use the new helper. Response still returns `{ sent: true, provider: 'resend' }` on success.

### 2. `supabase/functions/check-elevenlabs-quota/index.ts`
- Same treatment: drop `mapToBrevoPayload()`, replace `sendEmail()` Brevo fallback path with a direct Resend call that throws clear errors.
- The per-admin `try/catch` in the email loop stays so one failure doesn't stop the others.

### 3. `provision-user` edge function
- Apply the same cleanup if it contains a Brevo fallback. I'll read it first to confirm shape before editing.

### 4. Secret cleanup (after deploy)
- Once the three functions are deployed and a test invite succeeds, delete the `BREVO_API_KEY` secret via the secrets tool. Listed as a follow-up step, not part of the code patch — so you can confirm Resend is solid before removing it.

## What stays the same
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, all email templates, all preference logic, all CORS, all notification routing.
- No DB changes, no frontend changes.

## Verification
- After deploy: trigger "Resend invitation" on the pending student from the admin UI. Expect the toast to show success and the email to arrive from `feedback.kalmhub.com`.
- If it fails, the edge function logs will now show the actual Resend API error (e.g. domain mismatch, rate limit) instead of "Both Resend and Brevo failed".

Approve and I'll apply the patch.
