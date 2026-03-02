

## Admin Notifications v2 — Combined Plan

### What this fixes
- 779 "content_activity" notifications flood your bell icon, burying the 18 access requests you missed
- Clicking "new_access_request" does nothing — no navigation handler exists
- No email alerts — you only see notifications if you open the admin panel
- No way to choose what you get emailed about

---

### Part A: Fix In-App Notifications (no database changes)

**1. `src/components/admin/AdminNotificationsPopover.tsx`**
- Add click handlers for missing types:
  - `new_access_request` → `/admin?tab=accounts`
  - `ticket_assigned` → `/admin?tab=inbox`
  - (existing handlers for `content_activity`, `new_inquiry`, `new_feedback`, `inquiry_reply`, `feedback_reply` already work)
- Client-side grouping: collapse notifications with same `type + title` within 60 seconds into one entry showing "×N" badge
- Sorting: unread access requests and ticket assignments first, then other unread (newest first), then read
- "Clear old" button: deletes read notifications older than 7 days
- Better empty state: "All caught up" when no unread

**2. `src/hooks/useAdminNotifications.ts`**
- Add `useClearOldNotifications` mutation (deletes where `is_read = true` and `created_at < 7 days ago`)

**3. `supabase/functions/log-activity/index.ts` — Stop the flood**
- Currently every single content action (create, update, delete, bulk upload) inserts one notification per admin. A 150-item bulk upload = 150 notifications per admin.
- Fix: for `bulk_upload_*` actions, skip individual notification insertion. The bulk upload completion already logs a single activity entry — that's sufficient. Remove the per-item notification insert for bulk actions, or deduplicate by checking if a notification with the same title+actor already exists within 60 seconds before inserting.

---

### Part B: Email Notification Preferences

**4. Database migration: `admin_email_preferences` table**

| Column | Type | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid, unique, FK auth.users ON DELETE CASCADE | — |
| notify_access_requests | boolean | true |
| notify_new_feedback | boolean | true |
| notify_new_inquiries | boolean | true |
| notify_ticket_assigned | boolean | true |
| notify_new_content | boolean | false |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: authenticated users SELECT/INSERT/UPDATE own row only (`user_id = auth.uid()`). Updated_at trigger.

**5. `src/hooks/useEmailPreferences.ts`** — New hook
- Fetches preferences for current user (auto-creates default row if missing via upsert)
- Update mutation for toggling individual preferences

**6. UI: `PlatformSettingsTab` in `src/pages/AdminPage.tsx`**
- Add "Email Notifications" card below existing settings
- Five toggle switches (access requests, feedback, inquiries, ticket assigned, new content)
- Helper text: "You'll receive emails only for selected events"
- Only visible to platform admins and super admins

**7. `supabase/functions/send-admin-email/index.ts`** — New edge function
- POST payload: `{ recipient_user_id, type, notification_id }`
- Checks `admin_email_preferences` — if opted out, returns 204
- Fetches recipient email from `profiles.email`
- Fetches notification title/message from `admin_notifications` by ID
- Sends via Resend (using existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL`)
- Subject format: `[KALM Hub] New access request` etc.
- HTML email: title, message, CTA button linking to correct admin tab
- Type-to-column mapping ensures exact match between notification types and preference columns

**8. Triggering emails — Database trigger approach**
- Create a PL/pgSQL trigger function on `admin_notifications` AFTER INSERT
- Uses `pg_net` to POST to `send-admin-email` with `recipient_id`, `type`, and `id`
- This is the single point of email dispatch — no calls from `notify-ticket-admins` or other functions, preventing duplicates
- Type mapping (notification `type` → preference column):
  - `new_access_request` → `notify_access_requests`
  - `new_feedback` → `notify_new_feedback`
  - `new_inquiry` → `notify_new_inquiries`
  - `ticket_assigned` → `notify_ticket_assigned`
  - `content_activity` → `notify_new_content`
  - All others → no email

**9. No changes to `notify-ticket-admins`** — it keeps inserting in-app notifications only. The database trigger handles email dispatch, avoiding duplicate emails.

---

### Files summary

| File | Action |
|------|--------|
| `src/components/admin/AdminNotificationsPopover.tsx` | Fix navigation, add grouping, sorting, clear old |
| `src/hooks/useAdminNotifications.ts` | Add `useClearOldNotifications` mutation |
| `supabase/functions/log-activity/index.ts` | Skip per-item notifications for bulk actions |
| Migration SQL | Create `admin_email_preferences` + RLS + trigger |
| `src/hooks/useEmailPreferences.ts` | New — preferences CRUD |
| `src/pages/AdminPage.tsx` | Add email toggles to PlatformSettingsTab |
| `supabase/functions/send-admin-email/index.ts` | New — email dispatch via Resend |
| Migration SQL | pg_net trigger on `admin_notifications` INSERT |

