

## Fix: Invite Email Links Pointing to Wrong/Broken URL

### Root Cause

The invite emails contain a Supabase Auth verification link that redirects students to `https://www.kalmhub.com/auth?view=change-password`. If that domain has intermittent 522 errors (host connection timeout on Cloudflare), students see the error page instead of the password-set form.

Three things need fixing:

1. **`PUBLIC_APP_URL` Supabase secret** — may be set to `https://www.kalmhub.com` (with www) or the old lovable.app URL. Must be `https://kalmhub.com`.
2. **Hardcoded fallback URLs in edge functions** — `provision-user` falls back to `https://www.kalmhub.com`, `send-admin-email` and `check-elevenlabs-quota` fall back to `https://kasrkearnhub.lovable.app`.
3. **Supabase Auth Site URL & Redirect URLs** — must include `https://kalmhub.com` so Supabase allows the redirect after token verification.

### Changes

**1. Update `PUBLIC_APP_URL` Supabase secret**
- Set value to `https://kalmhub.com` (no trailing slash, no www)

**2. Update fallback URLs in three edge functions:**

- `supabase/functions/provision-user/index.ts` line 103: change fallback from `'https://www.kalmhub.com'` to `'https://kalmhub.com'`
- `supabase/functions/send-admin-email/index.ts` line 144: change fallback from `'https://kasrkearnhub.lovable.app'` to `'https://kalmhub.com'`
- `supabase/functions/check-elevenlabs-quota/index.ts` line 84: change fallback from `'https://kasrkearnhub.lovable.app'` to `'https://kalmhub.com'`

**3. Redeploy all three edge functions**

**4. Supabase Auth URL Configuration (manual step)**
- You need to go to Supabase Dashboard > Authentication > URL Configuration
- Set **Site URL** to `https://kalmhub.com`
- Add `https://kalmhub.com/**` to **Redirect URLs** (if not already there)
- Also keep `https://www.kalmhub.com/**` as a redirect URL for backward compatibility

### After the fix

- Resume approving pending requests — new invite links will use the correct `https://kalmhub.com` domain
- For students who already received broken links: use the **Resend** button in Admin > Accounts > All Requests to send them fresh invite emails with the corrected URL

### No code changes needed in the frontend
The Auth page (`src/pages/Auth.tsx`) already uses `window.location.origin` for its own password reset flow, so it adapts to whatever domain serves it.

