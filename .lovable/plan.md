

# Complete Plan: Unify Topic and Chapter UIs

## Current State Analysis

After investigation, I found that:

1. **TopicDetailPage still uses legacy code:**
   - Uses `useMcqSets` (legacy) instead of modern `useTopicMcqs` hook
   - MCQs render as simple Card titles, not interactive `McqList`
   - OSCE tab shows "Navigate to Chapter" message instead of actual questions
   - **No "Test Yourself" section** - only Resources and Self Assessment
   - No True/False tab

2. **Missing Hooks:**
   - `useTopicMcqs` - **Does NOT exist** (never created)
   - `useTopicOsceQuestions` - **Does NOT exist** (never created)
   - `useTopicTrueFalseQuestions` - ✅ Already exists

3. **Components already support `topicId`:**
   - `McqList` - ✅ Has `topicId` prop
   - `TrueFalseList` - ✅ Has `topicId` prop
   - `OsceList` - ✅ Has `topicId` prop
   - `ChapterMockExamSection` - ❌ Only has `chapterId` prop

4. **Database:**
   - `topic_id` columns were added to `mcqs`, `true_false_questions`, and `osce_questions` ✅

---

## Implementation Plan

### Step 1: Create Missing Hooks

**File: `src/hooks/useMcqs.ts`**

Add `useTopicMcqs` hook after `useChapterMcqs`:

```typescript
// Fetch MCQs by topic (with optional includeDeleted flag)
export function useTopicMcqs(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['mcqs', 'topic', topicId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('topic_id', topicId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!topicId,
  });
}
```

**File: `src/hooks/useOsceQuestions.ts`**

Add `useTopicOsceQuestions` hook:

```typescript
export function useTopicOsceQuestions(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['osce_questions', 'topic', topicId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('osce_questions')
        .select('*')
        .eq('topic_id', topicId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });
      if (error) throw error;
      return data as OsceQuestion[];
    },
    enabled: !!topicId,
  });
}
```

---

### Step 2: Update ChapterMockExamSection for Topic Support

**File: `src/components/exam/ChapterMockExamSection.tsx`**

Add `topicId` prop and use appropriate hooks:

```typescript
interface ChapterMockExamSectionProps {
  moduleId: string;
  chapterId?: string;
  topicId?: string;  // Add this
}

// Inside the component:
const { data: chapterMcqs } = useChapterMcqs(chapterId);
const { data: topicMcqs } = useTopicMcqs(topicId);
const mcqs = chapterId ? chapterMcqs : topicMcqs;

const { data: chapterOsce } = useChapterOsceQuestions(chapterId);
const { data: topicOsce } = useTopicOsceQuestions(topicId);
const osceQuestions = chapterId ? chapterOsce : topicOsce;
```

---

### Step 3: Major Refactor of TopicDetailPage

**File: `src/pages/TopicDetailPage.tsx`**

Transform to match ChapterPage structure:

**A. Update SectionMode type:**
```typescript
type SectionMode = 'resources' | 'practice' | 'test';  // Add 'test'
```

**B. Update section navigation:**
```typescript
const sectionNav = [
  { id: 'resources', label: 'Resources', mobileLabel: 'Resources', icon: FolderOpen },
  { id: 'practice', label: 'Self Assessment', mobileLabel: 'Self Assess', icon: GraduationCap },
  { id: 'test', label: 'Test Yourself', mobileLabel: 'Test', icon: ClipboardCheck },  // ADD
];
```

**C. Replace legacy hooks with modern ones:**
```typescript
// REMOVE legacy:
const { data: mcqSets, isLoading: mcqsLoading } = useMcqSets(topicId);

// ADD modern:
const { data: mcqs, isLoading: mcqsLoading } = useTopicMcqs(topicId, false);
const { data: deletedMcqs } = useTopicMcqs(topicId, true);
const { data: trueFalseQuestions } = useTopicTrueFalseQuestions(topicId);
const { data: deletedTrueFalseQuestions } = useTopicTrueFalseQuestions(topicId, true);
const { data: osceQuestions } = useTopicOsceQuestions(topicId);
const { data: deletedOsceQuestions } = useTopicOsceQuestions(topicId, true);
```

**D. Replace MCQ rendering (lines 442-482):**
```typescript
{practiceTab === 'mcqs' && (
  <McqList
    mcqs={filterBySection(mcqs || [])}
    deletedMcqs={deletedOnlyMcqs}
    moduleId={moduleId || ''}
    topicId={topicId}
    isAdmin={canManageContent}
    showDeletedToggle={canManageContent}
    showDeleted={showDeletedMcqs}
    onShowDeletedChange={setShowDeletedMcqs}
  />
)}
```

**E. Add True/False tab in practiceTabs:**
```typescript
const allPracticeTabs = createPracticeTabs({
  mcqs: mcqs?.length || 0,
  true_false: trueFalseQuestions?.length || 0,  // ADD
  essays: essays?.length || 0,
  // ...
});

{practiceTab === 'true_false' && (
  <TrueFalseList
    questions={filterBySection(trueFalseQuestions || [])}
    deletedQuestions={deletedOnlyTrueFalse}
    moduleId={moduleId || ''}
    topicId={topicId}
    isAdmin={canManageContent}
    showDeletedToggle={canManageContent}
    showDeleted={showDeletedTrueFalse}
    onShowDeletedChange={setShowDeletedTrueFalse}
  />
)}
```

**F. Replace OSCE placeholder with OsceList:**
```typescript
{practiceTab === 'osce' && (
  <OsceList
    questions={filterBySection(osceQuestions || [])}
    deletedQuestions={deletedOnlyOsce}
    moduleId={moduleId || ''}
    topicId={topicId}
    isAdmin={canManageContent}
    showDeletedToggle={canManageContent}
    showDeleted={showDeletedOsce}
    onShowDeletedChange={setShowDeletedOsce}
  />
)}
```

**G. Add Test Yourself section:**
```typescript
{activeSection === 'test' && topicId && moduleId && (
  <ChapterMockExamSection
    moduleId={moduleId}
    topicId={topicId}  // Pass topicId instead of chapterId
  />
)}
```

---

### Step 4: Update Mutation Hooks for Topic Support

**File: `src/hooks/useMcqs.ts`**

Update `useCreateMcq` and `useBulkCreateMcqs` to handle `topic_id`:

```typescript
// In useCreateMcq:
mutationFn: async (data: McqFormData & { 
  module_id: string; 
  chapter_id?: string | null;
  topic_id?: string | null;  // ADD
}) => {
  const { data: result, error } = await supabase.from('mcqs').insert({
    module_id: data.module_id,
    chapter_id: data.chapter_id || null,
    topic_id: data.topic_id || null,  // ADD
    // ...
  })
}

// In onSuccess - invalidate topic queries too:
if (result.topic_id) {
  queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topic_id] });
}
```

Similar updates for OSCE and True/False mutation hooks.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useMcqs.ts` | Add `useTopicMcqs`, update mutations for topic_id |
| `src/hooks/useOsceQuestions.ts` | Add `useTopicOsceQuestions` |
| `src/components/exam/ChapterMockExamSection.tsx` | Add `topicId` prop support |
| `src/pages/TopicDetailPage.tsx` | Major refactor - replace legacy code, add Test section |

---

## What This Achieves

After implementation, **TopicDetailPage will be identical to ChapterPage**:

| Feature | Before | After |
|---------|--------|-------|
| Section Navigation | Resources, Self Assessment | Resources, Self Assessment, **Test Yourself** |
| MCQ Display | Simple cards showing title only | Full **McqList** with interactive answer reveals, Cards/Table toggle |
| Admin Toolbar | Basic "Add MCQ Set" | **Select All, Bulk Import, Add, Cards/Table toggle** |
| True/False Tab | Not available | Full **TrueFalseList** component |
| OSCE Tab | "Navigate to Chapter" placeholder | Full **OsceList** component |
| Test Mode | Not available | Full **mock exam with timer** |
| Deleted Items Toggle | Not available | **Soft-delete management** for all content types |
| Section Filtering | Basic | **Full section filter support** for all content |

Any future feature or UI change made to ChapterPage will automatically apply to TopicDetailPage because they will use the same components (McqList, TrueFalseList, OsceList, ChapterMockExamSection).

---

## Technical Notes

- **Database already ready**: `topic_id` columns were added to all required tables
- **Components already support topicId**: McqList, TrueFalseList, OsceList all have topicId props
- **Only need to create hooks and update page**: The infrastructure is in place, just needs wiring
- **Edge function already updated**: `bulk-import-mcqs` already supports `topic_id`

