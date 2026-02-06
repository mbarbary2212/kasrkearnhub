# Plan: Fix MCQ Creation and Bulk Import for Topic-Based Modules

## Status: ✅ COMPLETED

All changes have been implemented to fix MCQ creation and bulk import for topic-based modules.

## Changes Made

### 1. Updated `src/hooks/useMcqs.ts`
- **useCreateMcq**: Added `topic_id` to mutation params and insert, plus cache invalidation for topic queries
- **useUpdateMcq**: Added `topicId` to params, scope logging, and cache invalidation
- **useDeleteMcq**: Added `topicId` to params, scope logging, and cache invalidation
- **useRestoreMcq**: Added `topicId` to params and cache invalidation
- **useBulkCreateMcqs**: Added `topicId` to params, edge function call, and cache invalidation

### 2. Updated `src/components/content/McqFormModal.tsx`
- Pass `topic_id: topicId || null` to create mutation

### 3. Updated `src/components/content/McqList.tsx`
- Pass `topicId` to bulk create mutation
- Pass `topicId` to delete and restore mutations

### 4. Updated `supabase/functions/bulk-import-mcqs/index.ts`
- Added `topicId` to RequestBody interface
- Extract `topicId` from request body
- Include `topic_id` in database insert records
- Edge function redeployed ✅

## Result

- **New MCQs created from TopicDetailPage** will have `topic_id` set correctly
- **Bulk imported MCQs** will include `topic_id`
- **Query invalidation** will refresh the topic MCQ list immediately
- All delete/restore operations properly invalidate topic queries

## Testing

Navigate to a topic-based module (e.g., Pharmacology → Topic):
1. Click "Add Question" → MCQ should appear after save
2. Click "Bulk Import" → MCQs should appear after import
3. Verify in database that `topic_id` is now set correctly
