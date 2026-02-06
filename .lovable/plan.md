

# Plan: Fix MCQ Creation and Bulk Import for Topic-Based Modules

## Problem Analysis

MCQs are being successfully inserted into the database but with `topic_id = null`. When `TopicDetailPage` queries using `useTopicMcqs` (which filters by `topic_id`), it returns 0 results because none of the MCQs have the `topic_id` set.

### Evidence from Database Query:
```
module_id: 64c5402c-4bbd-4758-bf08-544d3a2164cb
topic_id: null  <-- Should be 2d2e033d-d819-48b1-8d2f-6d4c3532e739
```

### Root Cause - 5 Components Need Updates:

| Component | Issue |
|-----------|-------|
| `useCreateMcq` hook | Doesn't accept or insert `topic_id` |
| `useBulkCreateMcqs` hook | Doesn't accept `topicId` or pass it to edge function |
| `McqFormModal` | Has `topicId` prop but doesn't pass it to create mutation |
| `McqList` | Calls bulk mutation without `topicId` |
| Edge Function `bulk-import-mcqs` | Doesn't extract or insert `topic_id` |

---

## Implementation Plan

### Step 1: Update `useCreateMcq` Hook

**File: `src/hooks/useMcqs.ts`**

Update the mutation to accept and insert `topic_id`, and invalidate topic queries:

```typescript
// Line 134 - Update type signature
mutationFn: async (data: McqFormData & { 
  module_id: string; 
  chapter_id?: string | null;
  topic_id?: string | null;  // ADD THIS
}) => {
  const { data: result, error } = await supabase.from('mcqs').insert({
    module_id: data.module_id,
    chapter_id: data.chapter_id || null,
    topic_id: data.topic_id || null,  // ADD THIS
    section_id: data.section_id || null,
    // ... rest unchanged
  }).select('id').single();

  return { ...data, id: result.id };
},

// Line 150-163 - Update onSuccess to invalidate topic queries
onSuccess: (result) => {
  toast({ title: 'MCQ added successfully' });
  queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.module_id] });
  if (result.chapter_id) {
    queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapter_id] });
  }
  if (result.topic_id) {  // ADD THIS
    queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topic_id] });
  }
  // ... rest unchanged
},
```

### Step 2: Update `useBulkCreateMcqs` Hook

**File: `src/hooks/useMcqs.ts`**

Update to accept and pass `topicId`:

```typescript
// Line 310-318 - Update type signature
mutationFn: async ({ 
  mcqs, 
  moduleId, 
  chapterId,
  topicId,  // ADD THIS
}: { 
  mcqs: McqFormData[]; 
  moduleId: string; 
  chapterId?: string | null;
  topicId?: string | null;  // ADD THIS
}) => {
  // Line 334 - Pass topicId to edge function
  body: JSON.stringify({ mcqs, moduleId, chapterId, topicId }),
  
  // Line 344 - Return topicId for cache invalidation
  return { moduleId, chapterId, topicId, count: mcqs.length };
},

// Line 346-351 - Update onSuccess
onSuccess: (result) => {
  toast({ title: `${result.count} MCQs imported successfully` });
  queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
  if (result.chapterId) {
    queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
  }
  if (result.topicId) {  // ADD THIS
    queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
  }
  // ... rest unchanged
},
```

### Step 3: Update `McqFormModal`

**File: `src/components/content/McqFormModal.tsx`**

Pass `topic_id` when creating a new MCQ:

```typescript
// Line 118-120 - Update createMutation.mutate call
createMutation.mutate(
  { 
    ...formData, 
    module_id: moduleId, 
    chapter_id: chapterId || null,
    topic_id: topicId || null,  // ADD THIS
  },
  { onSuccess: () => onOpenChange(false) }
);
```

### Step 4: Update `McqList`

**File: `src/components/content/McqList.tsx`**

Pass `topicId` when calling bulk import:

```typescript
// Line 606-607 - Update bulkCreateMutation.mutate call
bulkCreateMutation.mutate(
  { mcqs: itemsToImport, moduleId, chapterId, topicId },  // ADD topicId
  {
    onSuccess: () => {
      setShowBulkModal(false);
      resetBulkModal();
    },
  }
);
```

### Step 5: Update Edge Function

**File: `supabase/functions/bulk-import-mcqs/index.ts`**

Add `topicId` support:

```typescript
// Line 26-30 - Update RequestBody interface
interface RequestBody {
  mcqs: McqFormData[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;  // ADD THIS
}

// Line 96 - Extract topicId
const { mcqs, moduleId, chapterId, topicId } = body;

// Line 198-208 - Update records to include topic_id
const records = validatedMcqs.map((mcq, index) => ({
  module_id: moduleId,
  chapter_id: chapterId || null,
  topic_id: topicId || null,  // ADD THIS
  stem: mcq.stem,
  choices: filterValidChoices(mcq.choices),
  correct_key: mcq.normalizedCorrectKey,
  explanation: mcq.explanation,
  difficulty: mcq.difficulty,
  display_order: index,
  created_by: user.id,
}));

// Optional: Add topicId permission check (similar to chapter)
```

### Step 6: Also Update Other Mutation Hooks

Ensure `useUpdateMcq`, `useDeleteMcq`, and `useRestoreMcq` also invalidate topic queries when applicable.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useMcqs.ts` | Add `topic_id` support to `useCreateMcq`, `useBulkCreateMcqs`, and invalidation in other hooks |
| `src/components/content/McqFormModal.tsx` | Pass `topic_id` to create mutation |
| `src/components/content/McqList.tsx` | Pass `topicId` to bulk create mutation |
| `supabase/functions/bulk-import-mcqs/index.ts` | Handle `topicId` in request and insert |

---

## After Implementation

1. **New MCQs created from TopicDetailPage** will have `topic_id` set correctly
2. **Bulk imported MCQs** will include `topic_id`
3. **Query invalidation** will refresh the topic MCQ list immediately
4. **Existing MCQs** (already in DB with `topic_id = null`) can be updated via SQL if needed:
   ```sql
   -- Optional: Fix existing MCQs if you know which topic they belong to
   UPDATE mcqs SET topic_id = '2d2e033d-d819-48b1-8d2f-6d4c3532e739' 
   WHERE module_id = '64c5402c-4bbd-4758-bf08-544d3a2164cb' 
   AND topic_id IS NULL;
   ```

---

## Testing Checklist

After implementation:
1. Navigate to topic "Factors affecting action and dose and pharmacogenetics"
2. Click "Add Question" - verify new MCQ appears after save
3. Click "Bulk Import" - import a few MCQs and verify they appear
4. Check database to confirm `topic_id` is now set correctly

