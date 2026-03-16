

## Plan: ElevenLabs Quota Monitor Edge Function

### Overview
Create a scheduled Edge Function that checks ElevenLabs credit balance daily, sends in-app notifications to all super/platform admins, and emails critical alerts when credits fall below a configurable threshold.

### Key Correction (per your note)
The ElevenLabs `/v1/user` endpoint nests credit data under `subscription`:
```typescript
const userData = await elResponse.json();
const characterCount = userData.subscription?.character_count ?? 0;
const characterLimit = userData.subscription?.character_limit ?? 0;
const remaining = characterLimit - characterCount;
```

### Files to Create/Modify

**1. Create `supabase/functions/check-elevenlabs-quota/index.ts`**

Logic:
- Call `GET https://api.elevenlabs.io/v1/user` with `ELEVENLABS_API_KEY`
- Read `subscription.character_count` and `subscription.character_limit` from response
- Read threshold from `ai_settings` table (`elevenlabs_alert_threshold`, default 5000)
- Calculate `remaining = character_limit - character_count`
- Insert a daily summary notification into `admin_notifications` for all super/platform admins (type: `content_activity`)
- If `remaining < threshold`: send critical email alert using the existing Resend/Brevo fallback pattern to all admin emails
- Email includes remaining count, percentage, and a CTA link to AI Settings
- Returns JSON with quota stats and notification counts

Uses existing secrets: `ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BREVO_API_KEY`, `PUBLIC_APP_URL`

**2. Modify `supabase/config.toml`** — add:
```toml
[functions.check-elevenlabs-quota]
verify_jwt = false
```

**3. Insert threshold setting** (via SQL insert tool):
```sql
INSERT INTO ai_settings (key, value, description)
VALUES ('elevenlabs_alert_threshold', '5000', 'Credit threshold below which ElevenLabs low-balance email alerts are sent')
ON CONFLICT (key) DO NOTHING;
```

**4. Schedule daily cron job** (via SQL insert tool):
```sql
SELECT cron.schedule(
  'check-elevenlabs-quota-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/check-elevenlabs-quota',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bXhub2twcmZpd212emtzeWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjM3NjQsImV4cCI6MjA4MTQ5OTc2NH0.wGf_n_j8hOIXCRzd2fV_-Zy0suHEY1vI4ggFaU-f6oo"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Notification Behavior
- **Daily**: All super/platform admins get an in-app notification with remaining credits
- **Critical** (below threshold): Additionally sends an email alert with a branded HTML template showing remaining credits, percentage, and urgency messaging
- Threshold is configurable via the `ai_settings` table (default: 5000)

