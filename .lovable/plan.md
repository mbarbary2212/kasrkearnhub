

# In-App Messaging System for Feedback and Questions (Updated)

## Summary of Changes from Original Plan

Based on your feedback, I'm making these key corrections:

1. **Reuse existing `item_feedback` and `inquiries` tables** instead of creating new `student_feedback`/`student_questions` tables
2. **Standardize on "inquiry"** (not "question") to match existing code
3. **Restrict admin view access** to admin roles only (not all authenticated users)
4. **Block module admins from reading base `item_feedback` table** - they must use the secured view
5. **Add RLS policy for students to mark replies as read**
6. **Remove all mailto: behavior** - replies are in-app only, no email

---

## Current State Analysis

### Existing Tables (to be reused):
- `item_feedback` - Content-specific feedback with `user_id`, `is_anonymous` flag, module/chapter context
- `inquiries` - General questions with `user_id`, `is_anonymous` flag, subject/message
- `feedback` - Older anonymous feedback system with severity/category enums

### Current Issues:
- `FeedbackModal.tsx` uses `mailto:` instead of storing in database
- `InquiryModal.tsx` uses `mailto:` instead of storing in database  
- `item_feedback` table RLS allows module admins to see `user_id` (breaks anonymity)
- No reply system exists - only `admin_notes` field

---

## Database Changes

### 1. Create `admin_replies` Table

```sql
CREATE TABLE public.admin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT NOT NULL CHECK (thread_type IN ('feedback', 'inquiry')),
  thread_id UUID NOT NULL,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_replies_thread ON admin_replies(thread_type, thread_id);
CREATE INDEX idx_admin_replies_created ON admin_replies(created_at DESC);
CREATE INDEX idx_admin_replies_unread ON admin_replies(is_read) WHERE is_read = false;

ALTER TABLE admin_replies ENABLE ROW LEVEL SECURITY;
```

### 2. Create Secured View for Anonymous Feedback

Module admins can only access feedback through this view (hides `user_id`):

```sql
CREATE VIEW public.item_feedback_admin_view
WITH (security_invoker = on) AS
SELECT 
  id,
  module_id,
  chapter_id,
  item_type,
  item_id,
  rating,
  category,
  message,
  is_anonymous,
  is_flagged,
  status,
  admin_notes,
  resolved_by,
  resolved_at,
  created_at
FROM public.item_feedback;
-- Note: user_id is intentionally excluded

-- Grant access to admin roles only (NOT to all authenticated)
-- No GRANT statement needed - RLS on base table controls access
```

### 3. Update `item_feedback` RLS Policies

**Drop existing problematic policies and recreate:**

```sql
-- Drop policies that let module admins see user_id
DROP POLICY IF EXISTS "Module admins can view module feedback" ON public.item_feedback;
DROP POLICY IF EXISTS "Module admins can update module feedback" ON public.item_feedback;

-- Students can insert their own feedback (keep)
-- Students can view their own feedback (keep)

-- Super admins can view all feedback with user_id
CREATE POLICY "Super admins can view all feedback with identity"
ON public.item_feedback FOR SELECT
USING (is_super_admin(auth.uid()));

-- Platform admins can view all feedback with user_id
CREATE POLICY "Platform admins can view all feedback"
ON public.item_feedback FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

-- Module admins CANNOT directly select from item_feedback
-- They must use item_feedback_admin_view
-- No SELECT policy for module admins on base table

-- Admins can update feedback (status, notes, flags)
CREATE POLICY "Admins can update feedback"
ON public.item_feedback FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  is_platform_admin_or_higher(auth.uid()) OR
  is_module_admin(auth.uid(), module_id)
);
```

### 4. Create Security Definer Function for Module Admin Feedback Access

Since module admins can't read the base table, they need a function to access the view:

```sql
CREATE OR REPLACE FUNCTION get_module_feedback_for_admin(_module_id UUID)
RETURNS TABLE (
  id UUID,
  module_id UUID,
  chapter_id UUID,
  item_type TEXT,
  item_id UUID,
  rating INTEGER,
  category TEXT,
  message TEXT,
  is_anonymous BOOLEAN,
  is_flagged BOOLEAN,
  status TEXT,
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is module admin, platform admin, or super admin
  IF NOT (
    is_super_admin(auth.uid()) OR
    is_platform_admin_or_higher(auth.uid()) OR
    is_module_admin(auth.uid(), _module_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to view feedback for this module';
  END IF;

  RETURN QUERY
  SELECT 
    f.id, f.module_id, f.chapter_id, f.item_type, f.item_id,
    f.rating, f.category, f.message, f.is_anonymous, f.is_flagged,
    f.status, f.admin_notes, f.resolved_by, f.resolved_at, f.created_at
  FROM item_feedback_admin_view f
  WHERE f.module_id = _module_id
  ORDER BY f.created_at DESC;
END;
$$;
```

### 5. RLS Policies for `admin_replies`

```sql
-- Students can read replies to their own threads
CREATE POLICY "Students can read own replies"
ON admin_replies FOR SELECT
USING (
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback WHERE id = thread_id AND user_id = auth.uid()
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries WHERE id = thread_id AND user_id = auth.uid()
  ))
);

-- Students can UPDATE their own replies to mark as read
CREATE POLICY "Students can mark own replies as read"
ON admin_replies FOR UPDATE
USING (
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback WHERE id = thread_id AND user_id = auth.uid()
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries WHERE id = thread_id AND user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Only allow updating is_read to true
  is_read = true
);

-- Admins can insert replies
CREATE POLICY "Admins can insert replies"
ON admin_replies FOR INSERT
WITH CHECK (
  auth.uid() = admin_id AND (
    is_platform_admin_or_higher(auth.uid()) OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'teacher') OR
    -- Module admin can reply to feedback/inquiries for their modules
    (thread_type = 'feedback' AND EXISTS (
      SELECT 1 FROM item_feedback f WHERE f.id = thread_id AND is_module_admin(auth.uid(), f.module_id)
    )) OR
    (thread_type = 'inquiry' AND EXISTS (
      SELECT 1 FROM inquiries i WHERE i.id = thread_id AND is_module_admin(auth.uid(), i.module_id)
    ))
  )
);

-- Admins can read all replies
CREATE POLICY "Admins can read all replies"
ON admin_replies FOR SELECT
USING (
  is_platform_admin_or_higher(auth.uid()) OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'teacher') OR
  -- Module admins can read replies for their modules
  (thread_type = 'feedback' AND EXISTS (
    SELECT 1 FROM item_feedback f WHERE f.id = thread_id AND is_module_admin(auth.uid(), f.module_id)
  )) OR
  (thread_type = 'inquiry' AND EXISTS (
    SELECT 1 FROM inquiries i WHERE i.id = thread_id AND is_module_admin(auth.uid(), i.module_id)
  ))
);
```

---

## Frontend Changes

### 1. Update `FeedbackModal.tsx`
- Remove `mailto:` logic completely
- Use existing `useSubmitItemFeedback()` hook from `useItemFeedback.ts`
- Submit to `item_feedback` table
- Show success message confirming in-app delivery

### 2. Update `InquiryModal.tsx`
- Remove `mailto:` logic completely  
- Use existing `useSubmitInquiry()` hook from `useInquiries.ts`
- Submit to `inquiries` table
- Show success message confirming in-app delivery

### 3. Create New Hook: `useAdminReplies.ts`

```typescript
// Queries:
useThreadReplies(threadType: 'feedback' | 'inquiry', threadId: string)
useUnreadReplyCount() // For badge in MessagesCard

// Mutations:
useSubmitReply() // Admin: insert reply
useMarkReplyRead() // Student: mark is_read = true
```

### 4. Update `MessagesCard.tsx`

Add a third tab for "My Submissions" showing:
- Student's own feedback items (from `item_feedback` where `user_id = auth.uid()`)
- Student's own inquiries (from `inquiries` where `user_id = auth.uid()`)
- Admin replies to each thread (from `admin_replies`)
- Mark replies as read when viewed

Current tabs:
- Announcements
- Replies (shows inquiry admin_notes)

New structure:
- Announcements
- My Feedback (feedback + replies)
- My Questions (inquiries + replies)

### 5. Update `AdminInboxPage.tsx`

**Current behavior** (using AdminInbox for item_feedback and inquiries):
- Already has tabs for Feedback and Inquiries
- Shows user identity for super admins (revealable)

**Changes needed:**
- For Feedback tab: Use `get_module_feedback_for_admin()` RPC for module admins
- For Inquiries tab: Continue using direct query (identity visible is OK)
- Add "Reply" button and dialog to send in-app replies
- Show existing replies in thread view

### 6. Update `useItemFeedback.ts`

- Update `useAllFeedback()` to use RPC function for module admins
- Super/platform admins continue using direct query

---

## Security Summary

| Data | Student | Module Admin | Super Admin |
|------|---------|--------------|-------------|
| Submit feedback | Yes | No | No |
| View own feedback | Yes | - | - |
| View feedback message | - | Yes (via view) | Yes |
| View feedback user_id | - | No | Yes |
| Reply to feedback | - | Yes | Yes |
| Read own replies | Yes | - | - |
| Mark replies read | Yes | - | - |
| Submit inquiry | Yes | No | No |
| View inquiry user_id | - | Yes | Yes |
| Reply to inquiry | - | Yes | Yes |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/feedback/FeedbackModal.tsx` | Remove mailto, use `useSubmitItemFeedback` |
| `src/components/feedback/InquiryModal.tsx` | Remove mailto, use `useSubmitInquiry` |
| `src/components/connect/MessagesCard.tsx` | Add tabs for feedback/inquiries with replies |
| `src/pages/AdminInboxPage.tsx` | Add reply functionality, use secure functions for feedback |
| `src/hooks/useItemFeedback.ts` | Update to use RPC for module admins |
| `src/hooks/useAdminReplies.ts` | New file for reply management |
| `src/hooks/useUnreadMessages.ts` | Include admin_replies in unread count |

---

## Implementation Order

1. **Database migration** - Create `admin_replies` table, view, update RLS policies, create RPC function
2. **Create `useAdminReplies.ts`** hook
3. **Update `FeedbackModal.tsx`** - Remove mailto, store in DB
4. **Update `InquiryModal.tsx`** - Remove mailto, store in DB
5. **Update `useItemFeedback.ts`** - Use RPC for module admins
6. **Update `AdminInboxPage.tsx`** - Add reply dialog and thread view
7. **Update `MessagesCard.tsx`** - Add feedback/inquiry tabs with replies
8. **Update unread counting** - Include admin_replies

