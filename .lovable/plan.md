

# Question and Feedback Workflow System - Implementation Progress

## ✅ Completed Phases

This plan implements a ticket/inbox routing system for student questions (inquiries) and feedback, with hierarchical notifications to ensure all relevant admins are informed and can respond.

---

## Current State Analysis

### Existing Tables
- **inquiries**: Student questions with `module_id`, `chapter_id`, `category`, `status`, `user_id`
- **item_feedback**: Feedback for content items with `module_id`, `chapter_id`, `item_id`, `item_type`, `status`, `user_id`
- **admin_replies**: Conversation thread replies linked to inquiries or feedback
- **admin_notifications**: Notification system for admins (already in place)
- **module_admins**: Module-level admin assignments
- **topic_admins**: Chapter/topic-level admin assignments
- **department_admins**: Department-level admin assignments

### Existing Role Hierarchy (from `useAuth.ts`)
| Role | Level | Scope |
|------|-------|-------|
| student | 10 | Own content |
| teacher | 25 | Content creation |
| topic_admin | 35 | Assigned chapters/topics |
| admin/department_admin | 50 | Assigned modules |
| platform_admin | 75 | All content |
| super_admin | 100 | Everything |

### Current RLS Policies (already secure)
- Students can only see their own inquiries/feedback
- Module admins can see/update inquiries for their modules
- Platform/super admins can see all

---

## Proposed Changes

### Phase 1: Database Schema Additions

#### 1.1 Add Assignment and Tracking Fields to Inquiries Table

```sql
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS 
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_team TEXT CHECK (assigned_team IN ('platform', 'module', 'chapter', 'teacher')),
  seen_by_admin BOOLEAN DEFAULT false,
  first_viewed_at TIMESTAMPTZ,
  first_viewed_by UUID REFERENCES auth.users(id);
```

#### 1.2 Add Assignment and Tracking Fields to Item_feedback Table

```sql
ALTER TABLE item_feedback ADD COLUMN IF NOT EXISTS 
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_team TEXT CHECK (assigned_team IN ('platform', 'module', 'chapter', 'teacher')),
  seen_by_admin BOOLEAN DEFAULT false,
  first_viewed_at TIMESTAMPTZ,
  first_viewed_by UUID REFERENCES auth.users(id);
```

---

### Phase 2: Notification Trigger Edge Function

Create a new Edge Function `notify-admins-on-ticket` that:

1. **On new inquiry/feedback submission**:
   - Determines routing based on `module_id` and `chapter_id`
   - Sends notifications to ALL relevant admins up the hierarchy

2. **On admin reply**:
   - Notifies the student (handled by existing `admin_replies` read flow)
   - Notifies all higher-level admins about the response

#### 2.1 Notification Routing Logic

```text
When inquiry/feedback is created:

1. If chapter_id exists:
   - Find topic_admins for that chapter_id -> notify them
   - Get module_id from chapter -> notify module_admins
   - Notify platform_admins and super_admins

2. If only module_id exists:
   - Notify module_admins for that module
   - Notify platform_admins and super_admins

3. If neither (general inquiry):
   - Route to platform inbox
   - Notify platform_admins and super_admins
```

#### 2.2 Edge Function: `supabase/functions/notify-ticket-admins/index.ts`

This function will:
- Accept webhook from database trigger or be called from client
- Query the admin hierarchy based on module_id/chapter_id
- Insert notifications to `admin_notifications` for each relevant admin
- Include metadata: inquiry/feedback ID, category, module name, chapter name

---

### Phase 3: Database Triggers

Create database triggers to automatically call the notification function:

```sql
-- Trigger on new inquiry
CREATE OR REPLACE FUNCTION notify_on_new_inquiry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/notify-ticket-admins',
    body := jsonb_build_object(
      'type', 'inquiry',
      'id', NEW.id,
      'module_id', NEW.module_id,
      'chapter_id', NEW.chapter_id,
      'category', NEW.category,
      'subject', NEW.subject
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_inquiry
AFTER INSERT ON inquiries
FOR EACH ROW EXECUTE FUNCTION notify_on_new_inquiry();

-- Similar trigger for item_feedback
```

---

### Phase 4: Admin Reply Notification Enhancement

Update `useAdminReplies.ts` `useSubmitReply` hook to:

1. After successful reply insertion, call the notification function
2. Notify all admins above the replying admin's level
3. Include context: "Admin X replied to inquiry about Y"

#### Changes to `src/hooks/useAdminReplies.ts`

```typescript
// After insert, trigger notification to higher-level admins
const notifyHigherAdmins = async (threadType: ThreadType, threadId: string) => {
  await supabase.functions.invoke('notify-ticket-admins', {
    body: { 
      type: 'reply',
      threadType,
      threadId,
      replyBy: user.id
    }
  });
};
```

---

### Phase 5: Admin Inbox UI Enhancements

#### 5.1 Update `AdminInboxPage.tsx`

Add new capabilities:
- **Assignment dropdown**: Assign to specific user or team
- **Filter by assignment**: View "Assigned to me", "Unassigned", "All"
- **Seen indicator**: Mark items as seen on first view
- **Reply count badge**: Show number of replies in thread

#### 5.2 New Component: Assignment Selector

```typescript
// src/components/admin/TicketAssignmentSelector.tsx
interface TicketAssignmentSelectorProps {
  ticketId: string;
  ticketType: 'inquiry' | 'feedback';
  moduleId: string | null;
  chapterId: string | null;
  currentAssignee: string | null;
  onAssign: (userId: string | null, team: string) => void;
}
```

Features:
- Dropdown showing available assignees based on module/chapter
- Option to assign to team (platform, module, chapter)
- Option to assign to specific person

---

### Phase 6: Notification Types and Display

#### 6.1 New Notification Types

| Type | Title | Message Template |
|------|-------|------------------|
| `new_inquiry` | New Question | "A student asked a question about [module/chapter]: [subject]" |
| `new_feedback` | New Feedback | "New [category] feedback received for [module/chapter]" |
| `inquiry_reply` | Question Reply | "[Admin name] replied to a question about [subject]" |
| `feedback_reply` | Feedback Reply | "[Admin name] replied to feedback about [item]" |
| `ticket_assigned` | Assigned to You | "You've been assigned a [inquiry/feedback] about [subject]" |

#### 6.2 Update `AdminNotificationsPopover.tsx`

Add handlers for new notification types:
- Navigate to Admin Inbox with filter when clicking inquiry/feedback notifications
- Show appropriate icons for different notification types

---

### Phase 7: Student View Enhancements

#### 7.1 Update `MessagesCard.tsx`

Show assignment status to students (optional transparency):
- "Your question is being reviewed by the [Module Name] team"
- "A faculty member is looking into your feedback"

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/notify-ticket-admins/index.ts` | Edge function for hierarchical notifications |
| `src/components/admin/TicketAssignmentSelector.tsx` | UI for assigning tickets |
| `supabase/migrations/YYYYMMDD_ticket_workflow.sql` | Schema additions |

### Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useAdminReplies.ts` | Add notification on reply |
| `src/hooks/useInquiries.ts` | Add assignment mutation, seen tracking |
| `src/hooks/useItemFeedback.ts` | Add assignment mutation, seen tracking |
| `src/pages/AdminInboxPage.tsx` | Assignment UI, filters, seen indicator |
| `src/hooks/useAdminNotifications.ts` | Handle new notification types |
| `src/components/admin/AdminNotificationsPopover.tsx` | Icons and navigation for new types |

---

## Notification Flow Diagram

```text
Student submits inquiry/feedback
            |
            v
    [Database Insert]
            |
            v
   [Trigger fires]
            |
            v
[notify-ticket-admins Edge Function]
            |
    +-------+-------+
    |       |       |
    v       v       v
 Chapter  Module  Platform
 Admins   Admins   Admins
   |        |        |
   +--------+--------+
            |
            v
  [All see notification bell]
            |
            v
   [Any admin replies]
            |
            v
  [Higher admins notified]
            |
            v
  [Student sees reply in Messages]
```

---

## RLS Policy Updates (if needed)

Current RLS is already secure. May need to add:

```sql
-- Allow admins to update assignment fields
CREATE POLICY "Admins can assign tickets"
ON inquiries FOR UPDATE
USING (
  is_platform_admin_or_higher(auth.uid()) 
  OR is_module_admin(auth.uid(), module_id)
)
WITH CHECK (
  is_platform_admin_or_higher(auth.uid()) 
  OR is_module_admin(auth.uid(), module_id)
);
```

---

## Implementation Order

1. **Database migration** - Add new columns
2. **Edge function** - Create notification logic
3. **Database triggers** - Auto-notify on insert
4. **Hook updates** - Add assignment and notification calls
5. **UI updates** - Admin inbox enhancements
6. **Notification popover** - Handle new types
7. **Testing** - End-to-end workflow verification

---

## Security Considerations

- Notifications only sent to admins with appropriate scope
- Students cannot see other students' tickets
- Assignment can only be done by admins with access to the ticket
- Sensitive data (student identity for anonymous feedback) protected by existing RLS

