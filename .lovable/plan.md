
# Email Bounce Monitoring Implementation Plan

## Summary

This plan adds bounce/complaint monitoring for invitation emails by:
1. Creating a new `email_events` database table
2. Adding a `resend-webhook` Edge Function to receive Resend webhook events
3. Updating the Accounts admin UI to show bounce warnings

The email template and UI spam notices have already been implemented (per the diff shown).

---

## 1. Database: Create `email_events` Table

Create a new table to store email delivery events from Resend webhooks.

**Table Structure:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique event identifier |
| resend_email_id | text | Resend's email ID (for correlation) |
| to_email | text | Recipient email address |
| event_type | text | Event type (delivered, bounced, complained, etc.) |
| status | text | Status derived from event |
| reason | text | Bounce/failure reason message |
| metadata | jsonb | Full event payload for debugging |
| created_at | timestamptz | When the event was recorded |

**RLS Policy:**
- Allow insert from service role only (webhooks run unauthenticated)
- Allow select for platform/super admins only

**Indexes:**
- Index on `to_email` for fast lookup by email address
- Index on `event_type` for filtering bounces/complaints

---

## 2. Edge Function: `resend-webhook`

Create a new Edge Function to receive webhook events from Resend.

**Endpoint:** `POST /resend-webhook`

**Functionality:**
1. Parse the incoming webhook payload
2. Extract: email ID, recipient (`to`), event type, bounce reason
3. Insert the event into `email_events` table
4. Log the event type and email (not secrets)
5. Return 200 OK to acknowledge receipt

**Security:**
- Set `verify_jwt = false` (webhooks don't have JWT)
- Optionally verify Resend webhook signature using svix (future enhancement)
- Use service role key to insert into protected table

**Supported Event Types:**
- `email.delivered` - Email successfully delivered
- `email.bounced` - Hard bounce (permanent failure)
- `email.complained` - Marked as spam
- `email.failed` - Send failure
- (Others logged but not specifically handled)

**Webhook Payload Example:**
```json
{
  "type": "email.bounced",
  "created_at": "2024-11-22T23:41:12.126Z",
  "data": {
    "email_id": "8b146471-e88e-4322-86af-016cd36fd216",
    "to": ["user@example.com"],
    "bounce": {
      "message": "The recipient's email address is on the suppression list..."
    }
  }
}
```

---

## 3. UI: Bounce Warning in Accounts Tab

Update the admin Accounts tab to show email deliverability warnings.

**Changes to `AccountsTab.tsx`:**

1. **Add a new hook** `useEmailBounces()` to fetch bounced/complained events:
   - Query `email_events` for `event_type IN ('email.bounced', 'email.complained')`
   - Group by `to_email` to get unique problem addresses
   - Return count and list of bounced emails

2. **Add a warning badge** in the header area:
   - Show a red badge with count of bounced emails
   - Example: "3 Bounced Emails" with AlertTriangle icon
   - Clicking opens a popover/dialog with details

3. **Show per-row indicator** in the All Requests table:
   - If an email address has a bounce record, show a small warning icon
   - Tooltip shows the bounce reason

**UI Mockup (header area):**
```
Account Management                           [⚠️ 3 Bounced] [Bulk Invite]
Manage access requests and invite new users
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/` | Create | SQL migration for `email_events` table |
| `supabase/functions/resend-webhook/index.ts` | Create | New Edge Function for webhooks |
| `supabase/config.toml` | Modify | Add `verify_jwt = false` for resend-webhook |
| `src/hooks/useEmailBounces.ts` | Create | Hook to fetch bounce data |
| `src/components/admin/AccountsTab.tsx` | Modify | Add bounce warning UI |
| `src/components/admin/EmailBouncesPopover.tsx` | Create | Popover showing bounce details |

---

## Technical Implementation Details

### Database Migration SQL

```sql
-- Create email_events table for Resend webhook tracking
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id text,
  to_email text NOT NULL,
  event_type text NOT NULL,
  status text,
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_email_events_to_email ON public.email_events(to_email);
CREATE INDEX idx_email_events_event_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can view email events"
ON public.email_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('platform_admin', 'super_admin')
  )
);

-- Service role insert (for webhooks)
-- Note: Service role bypasses RLS, so no explicit policy needed for insert
```

### Edge Function Structure

```typescript
// supabase/functions/resend-webhook/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '...',
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    bounce?: { message: string };
    // ... other fields
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: ResendWebhookEvent = await req.json();
    
    // Use service role to insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Extract data
    const eventType = event.type;
    const toEmail = event.data.to?.[0] || 'unknown';
    const reason = event.data.bounce?.message || null;

    // Insert event
    await supabaseAdmin.from('email_events').insert({
      resend_email_id: event.data.email_id,
      to_email: toEmail.toLowerCase(),
      event_type: eventType,
      status: eventType.replace('email.', ''),
      reason: reason,
      metadata: event,
    });

    console.log(`Email event received: ${eventType} for ${toEmail}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### Bounce Hook

```typescript
// src/hooks/useEmailBounces.ts
export function useEmailBounces() {
  return useQuery({
    queryKey: ['email-bounces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .in('event_type', ['email.bounced', 'email.complained'])
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });
}
```

---

## Setup Instructions (After Implementation)

1. **Configure Resend Webhook:**
   - Go to Resend dashboard → Webhooks
   - Add endpoint: `https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/resend-webhook`
   - Select events: `email.delivered`, `email.bounced`, `email.complained`, `email.failed`

2. **Test the webhook:**
   - Send a test event from Resend dashboard
   - Check Edge Function logs
   - Verify record appears in `email_events` table

---

## What This Does NOT Change

- No mailto: links reintroduced
- Existing RESEND secrets remain unchanged
- Feedback/questions system stays in-app only
- Email template already updated (per previous implementation)
- UI spam notices already added (per previous implementation)
