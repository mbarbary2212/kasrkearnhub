

# Fix: Show Requester Identity in Avatar/Voice Requests + Data Clarification

## Answer to Your Questions

**1. Who sent the request?**
The `requested_by` user ID is stored in `metadata` but the requester's **name and email are never resolved or displayed**. The admin notification just shows the raw message text — no sender info. The admin has no way to know who asked or contact them.

**2. Which table stores interactive cases?**
All interactive cases live in one table: **`virtual_patient_cases`**. The case you see with "Post-operative Wound Dehiscence" is the only non-deleted, published case. If the title/details look different from what you expect, the `generated_case_data` JSONB column may contain different patient info than the top-level `title` and `intro_text` fields — the case editor updates `generated_case_data` but the top-level fields may have been set at creation time and never synced.

---

## Changes

### 1. Include Requester Name in Notification Message
**File**: `src/components/clinical-cases/CasePreviewEditor.tsx`

In both `handleRequestAvatar` and `handleRequestVoice`:
- Fetch the current user's profile (name, email) before sending
- Include requester name and email in the notification `message` (e.g., "Request from Dr. Ahmed (ahmed@example.com): I need a female voice...")
- Also add `requester_name` and `requester_email` to `metadata` so the notification popover can display it

### 2. Show Requester Info in Notification Popover
**File**: `src/components/admin/AdminNotificationsPopover.tsx`

- For `voice_request` and `avatar_request` notification types, display the requester name/email from metadata below the message
- Add a `mailto:` link so the admin can click to email the requester directly
- Add icon entries for these two types (currently fall through to default)
- Add navigation: clicking these notifications goes to the Admin Platform Settings tab (where voices/avatars are managed)

### 3. Add `voice_request` / `avatar_request` to Email Trigger
**File**: `trigger_send_admin_email` function — add these two types to the allowed list so admins also get email alerts for voice/avatar requests (currently these types are not in the trigger's whitelist, so no email is sent).

**Migration**: Update the trigger function to include the new types.

---

## Summary

| File | Change |
|---|---|
| `CasePreviewEditor.tsx` | Include requester name/email in notification message + metadata |
| `AdminNotificationsPopover.tsx` | Show requester info, mailto link, icons, navigation for request types |
| DB migration | Update `trigger_send_admin_email` to include `voice_request` and `avatar_request` |

3 files changed. No new tables.

