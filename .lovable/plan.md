

## Add Notifications for Role & Assignment Changes

### What's Missing
When an admin changes a user's role or assigns them as module/topic admin, the affected user gets no notification — they only discover the change next time they log in.

### Proposed Changes

**1. Database trigger: `notify_user_role_change`**
- Fires on INSERT/UPDATE on `user_roles`
- Inserts an `admin_notification` for the affected user with type `role_changed`
- Message: "Your role has been updated to [role]"

**2. Database trigger: `notify_user_module_assignment`**
- Fires on INSERT on `module_admins`
- Looks up the module name, inserts notification with type `module_assigned`
- Message: "You have been assigned as admin for [module name]"

**3. Database trigger: `notify_user_topic_assignment`**
- Fires on INSERT on `topic_admins`
- Looks up topic/chapter name, inserts notification with type `topic_assigned`
- Message: "You have been assigned as admin for [topic/chapter name]"

**4. Email delivery**
- Add `role_changed`, `module_assigned`, `topic_assigned` to the allowed types in the `trigger_send_admin_email()` function so the existing email pipeline picks them up automatically
- Update the `send-admin-email` edge function to format these new notification types with appropriate subject lines and bodies

**5. Frontend — notification routing**
- Update the notification click handler to navigate appropriately for new types (e.g., `role_changed` → no specific route, `module_assigned` → module page)

### Files Affected

| Area | Change |
|------|--------|
| SQL migration | Create 3 trigger functions + attach to tables |
| SQL migration | Update `trigger_send_admin_email` to include new types |
| `supabase/functions/send-admin-email/index.ts` | Add email templates for new notification types |
| `src/components/admin/AdminNotificationsPopover.tsx` | Add click routing for new types |

### Notes
- Notifications go to the **affected user**, not to admins — this uses the same `admin_notifications` table but the recipient is the user whose role/assignment changed
- The email side piggybacks on the existing `trigger_send_admin_email` → `send-admin-email` pipeline
- Role downgrades (e.g., teacher → student) also trigger a notification so the user understands why permissions changed

