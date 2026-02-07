

# Add Topic Support to Feedback and Inquiries System

## Problem Summary

The recent chapter/topic unification addressed content tables (MCQs, flashcards, study resources, question attempts), but the feedback and inquiry systems still only support `chapter_id`. This means:

- Feedback submitted from topic-based modules (like Pharmacology) cannot be tagged to the topic
- Inquiries from topic pages have no topic context
- Topic admins cannot see feedback/inquiries for their topics
- Admin notification routing doesn't work for topic-based content

---

## Current State

### Database Schema Gaps

| Table | chapter_id | topic_id |
|-------|-----------|----------|
| `inquiries` | ✅ Exists | ❌ Missing |
| `item_feedback` | ✅ Exists | ❌ Missing |

### Code Gaps

| Component | Current Props | Issue |
|-----------|--------------|-------|
| `LectureList` | `chapterId?` | No `topicId` prop |
| `ItemFeedbackModal` | `chapterId?` | No `topicId` prop |
| `InquiryModal` | `chapterId?` | No `topicId` prop |
| `ContentItemActions` | `chapterId?` | No `topicId` prop |
| `useSubmitItemFeedback` | `chapterId` | No `topicId` param |
| `useSubmitInquiry` | `chapterId` | No `topicId` param |
| `TopicDetailPage` → `LectureList` | Missing `topicId` | Feedback not tagged |

---

## Phase 1: Database Migration

Add `topic_id` to both tables with mutual exclusivity constraint:

```sql
-- Add topic_id to inquiries
ALTER TABLE inquiries 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_inquiries_topic_id ON inquiries(topic_id);

-- Add topic_id to item_feedback
ALTER TABLE item_feedback 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_item_feedback_topic_id ON item_feedback(topic_id);
```

Add RLS policies for topic admins to view feedback/inquiries for their topics.

---

## Phase 2: Update Hooks

### useItemFeedback.ts

Add `topicId` parameter to `useSubmitItemFeedback`:

```typescript
mutationFn: async (data: {
  moduleId: string;
  chapterId?: string;  // For chapter-based
  topicId?: string;    // NEW: For topic-based
  itemType: ItemType;
  // ...
}) => {
  const { data: insertedData, error } = await supabase.from('item_feedback').insert({
    module_id: data.moduleId,
    chapter_id: data.chapterId || null,
    topic_id: data.topicId || null,  // NEW
    // ...
  });
  
  // Notify admins with topic support
  await supabase.functions.invoke('notify-ticket-admins', {
    body: {
      type: 'feedback',
      module_id: data.moduleId,
      chapter_id: data.chapterId || null,
      topic_id: data.topicId || null,  // NEW
      // ...
    },
  });
}
```

Add `topicIds` filter to `useAllFeedback`:

```typescript
if (filters?.topicIds && filters.topicIds.length > 0) {
  query = query.in('topic_id', filters.topicIds);
}
```

### useInquiries.ts

Same pattern - add `topicId` support to:
- `useSubmitInquiry` mutation
- `useAllInquiries` filter

---

## Phase 3: Update Components

### ItemFeedbackModal

Add `topicId` prop and pass to hook:

```typescript
interface ItemFeedbackModalProps {
  moduleId: string;
  chapterId?: string;  // For chapters
  topicId?: string;    // NEW: For topics
  itemType: ItemType;
  // ...
}

// In handleSubmit:
await submitFeedback.mutateAsync({
  moduleId,
  chapterId,
  topicId,  // NEW
  // ...
});
```

### InquiryModal

Add `topicId` prop:

```typescript
interface InquiryModalProps {
  moduleId?: string;
  chapterId?: string;
  topicId?: string;  // NEW
  // ...
}
```

### LectureList

Add `topicId` prop:

```typescript
interface LectureListProps {
  lectures: Lecture[];
  moduleId?: string;
  chapterId?: string;  // For chapters
  topicId?: string;    // NEW: For topics
  // ...
}

// Pass to ItemFeedbackModal:
<ItemFeedbackModal
  moduleId={moduleId}
  chapterId={chapterId}
  topicId={topicId}  // NEW
  // ...
/>
```

### ContentItemActions

Same pattern - add `topicId` prop and pass through.

---

## Phase 4: Update Pages

### TopicDetailPage.tsx

Pass `topicId` to all child components that handle feedback:

```typescript
<LectureList 
  lectures={filterBySection(lectures) || []} 
  moduleId={moduleId}
  topicId={topicId}  // NEW - was missing!
  canEdit={canManageContent}
  canDelete={canManageContent}
/>
```

Also update other components like `EssayList`, `ResourceList`, etc.

---

## Phase 5: Edge Function Update

The `notify-ticket-admins` edge function was already updated in the previous work to support `topic_id`. Verify it:
- Routes to topic admins when `topic_id` is provided
- Resolves topic name for context

---

## Phase 6: Admin Filtering

Update the admin inbox/feedback panel to support topic filtering:

```typescript
// In admin hooks
const { data: feedback } = useAllFeedback({
  moduleIds: filterModules,
  chapterIds: filterChapters,
  topicIds: filterTopics,  // NEW
});
```

---

## Files to Modify

### Database
- New migration: Add `topic_id` to `inquiries` and `item_feedback`

### Hooks
- `src/hooks/useItemFeedback.ts` - Add `topicId` support
- `src/hooks/useInquiries.ts` - Add `topicId` support

### Components
- `src/components/feedback/ItemFeedbackModal.tsx` - Add `topicId` prop
- `src/components/feedback/InquiryModal.tsx` - Add `topicId` prop
- `src/components/content/LectureList.tsx` - Add `topicId` prop
- `src/components/content/ResourceList.tsx` - Add `topicId` prop  
- `src/components/content/VideoCard.tsx` - Add `topicId` prop
- `src/components/content/McqSetList.tsx` - Add `topicId` prop
- `src/components/admin/ContentItemActions.tsx` - Add `topicId` prop

### Pages
- `src/pages/TopicDetailPage.tsx` - Pass `topicId` to child components

---

## Testing Checklist

After implementation:

- [ ] Submit feedback from a topic page (Pharmacology) - verify `topic_id` is saved
- [ ] Submit inquiry from a topic page - verify `topic_id` is saved
- [ ] Verify topic admins receive notifications for their topic's feedback
- [ ] Verify admin inbox can filter by topics
- [ ] Verify chapter-based feedback still works correctly
- [ ] Verify no TypeScript errors

---

## Summary

This completes the chapter/topic unification by extending dual support to the feedback and inquiry systems, ensuring:

1. Topic-based modules can properly tag feedback and inquiries
2. Topic admins receive relevant notifications
3. Admin filtering works for both chapters and topics
4. The same UI patterns and behavior apply everywhere

