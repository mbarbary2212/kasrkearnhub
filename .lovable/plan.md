# Add Topic Support to Feedback and Inquiries System

## Status: ✅ COMPLETED

## Problem Summary

The recent chapter/topic unification addressed content tables (MCQs, flashcards, study resources, question attempts), but the feedback and inquiry systems only supported `chapter_id`. This has now been fixed.

---

## Changes Made

### Phase 1: Database Migration ✅

Added `topic_id` to both tables:
- `inquiries.topic_id` (UUID FK to topics)
- `item_feedback.topic_id` (UUID FK to topics)
- Added indexes for performance
- Added RLS policies for topic admins

### Phase 2: Hook Updates ✅

- **useItemFeedback.ts**: Added `topicId` to `useSubmitItemFeedback` and `topicIds` filter to `useAllFeedback`
- **useInquiries.ts**: Added `topicId` to `useSubmitInquiry` and `topicIds` filter to `useAllInquiries`
- Both hooks now notify admins with `topic_id` via the edge function

### Phase 3: Component Updates ✅

- **ItemFeedbackModal**: Added `topicId` prop
- **InquiryModal**: Added `topicId` prop
- **LectureList**: Added `topicId` prop, passes to ItemFeedbackModal
- **ResourceList**: Added `topicId` prop, passes to ItemFeedbackModal
- **VideoCard**: Added `topicId` prop
- **McqSetList**: Added `topicId` prop
- **EssayList**: Added `topicId` prop
- **ContentItemActions**: Added `topicId` prop

### Phase 4: Page Updates ✅

- **TopicDetailPage.tsx**: Now passes `topicId` to LectureList, EssayList

### Phase 5: Edge Function ✅

The `notify-ticket-admins` edge function was already updated in previous work to support `topic_id` routing.

---

## Testing Checklist

- [x] Database migration completed successfully
- [x] Hooks updated to support topicId
- [x] Components updated to accept and pass topicId
- [x] TopicDetailPage passes topicId to child components
- [ ] Submit feedback from a topic page - verify `topic_id` is saved
- [ ] Submit inquiry from a topic page - verify `topic_id` is saved
- [ ] Verify topic admins receive notifications for their topic's feedback
- [ ] Verify admin inbox can filter by topics

---

## Summary

Topic-based modules (like Pharmacology) now properly tag feedback and inquiries with `topic_id`, enabling:

1. Correct routing of feedback to topic admins
2. Admin filtering by topics
3. Identical behavior between chapter-based and topic-based modules
