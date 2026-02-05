

# Plan: Unify Chapter/Topic UI Across All Modules

## Problem Summary

The app currently has two different UIs depending on whether a module uses **Chapters** (Surgery) or **Topics** (Pharmacology):

| Feature | ChapterPage (Surgery) | TopicDetailPage (Pharmacology) |
|---------|----------------------|--------------------------------|
| MCQ Component | Modern `McqList` | Legacy `AdminContentActions` + `useMcqSets` |
| "Test Yourself" | Yes | No |
| True/False | Yes | No |
| OSCE | Modern `OsceList` | No |
| View Toggle | Cards/Table | Not available |
| Section modes | resources, practice, test | resources, practice only |

Additionally, the **BookFormModal** "Chapter Label Style" dropdown has options that should be removed: "Unit", "Section", "Part"

---

## Solution

### Part 1: Simplify Chapter Label Style Dropdown

**File:** `src/components/module/BookFormModal.tsx`

Remove "Unit", "Section", and "Part" from the dropdown, keeping only "Chapter (Ch)" and "Lecture (Lec)":

```typescript
// Before
const CHAPTER_PREFIXES = [
  { value: 'Ch', label: 'Chapter (Ch)' },
  { value: 'Lec', label: 'Lecture (Lec)' },
  { value: 'Unit', label: 'Unit' },        // Remove
  { value: 'Section', label: 'Section' },  // Remove
  { value: 'Part', label: 'Part' },        // Remove
];

// After
const CHAPTER_PREFIXES = [
  { value: 'Ch', label: 'Chapter (Ch)' },
  { value: 'Lec', label: 'Lecture (Lec)' },
];
```

---

### Part 2: Database - Add `topic_id` to `mcqs` Table

Topics need to use the modern `mcqs` table instead of the legacy `mcq_sets` table.

**SQL Migration:**
```sql
-- Add topic_id to mcqs for topics to use the modern MCQ system
ALTER TABLE public.mcqs ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id);
CREATE INDEX IF NOT EXISTS idx_mcqs_topic_id ON public.mcqs(topic_id);
```

---

### Part 3: Create Topic Hooks for Modern Tables

**File:** `src/hooks/useMcqs.ts`

Add `useTopicMcqs` hook to query MCQs by topic:

```typescript
export function useTopicMcqs(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['mcqs', 'topic', topicId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase.from('mcqs').select('*').eq('topic_id', topicId!);
      if (!includeDeleted) query = query.eq('is_deleted', false);
      const { data, error } = await query.order('display_order');
      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!topicId,
  });
}
```

---

### Part 4: Refactor TopicDetailPage to Match ChapterPage

**File:** `src/pages/TopicDetailPage.tsx`

Major changes to align with ChapterPage:

1. **Add "Test Yourself" section mode:**
   ```typescript
   type SectionMode = 'resources' | 'practice' | 'test';  // Add 'test'
   ```

2. **Add navigation item for Test Yourself:**
   ```typescript
   const sectionNav = [
     { id: 'resources', label: 'Resources', icon: FolderOpen },
     { id: 'practice', label: 'Self Assessment', icon: GraduationCap },
     { id: 'test', label: 'Test Yourself', icon: ClipboardCheck },  // Add this
   ];
   ```

3. **Replace legacy MCQ handling with modern McqList:**
   ```typescript
   // Remove: const { data: mcqSets } = useMcqSets(topicId);
   // Add:
   import { useTopicMcqs } from '@/hooks/useMcqs';
   import { McqList } from '@/components/content/McqList';
   
   const { data: mcqs } = useTopicMcqs(topicId, false);
   const { data: deletedMcqs } = useTopicMcqs(topicId, true);
   
   // In the MCQs tab:
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
   ```

4. **Add True/False tab:**
   ```typescript
   import { useTopicTrueFalseQuestions } from '@/hooks/useTrueFalseQuestions';
   import { TrueFalseList } from '@/components/content/TrueFalseList';
   ```

5. **Add OSCE tab:**
   ```typescript
   import { useTopicOsceQuestions } from '@/hooks/useOsceQuestions';
   import { OsceList } from '@/components/content/OsceList';
   ```

6. **Add Test Yourself section:**
   ```typescript
   import { ChapterMockExamSection } from '@/components/exam';
   
   {activeSection === 'test' && (
     <ChapterMockExamSection
       chapterId={topicId!}
       moduleId={moduleId || ''}
     />
   )}
   ```

---

### Part 5: Add Topic Support to Content Hooks

**Files to modify:**
- `src/hooks/useTrueFalseQuestions.ts` - Add `useTopicTrueFalseQuestions`
- `src/hooks/useOsceQuestions.ts` - Add `useTopicOsceQuestions`
- `src/hooks/useMatchingQuestions.ts` - Already has `useTopicMatchingQuestions`

Each hook follows the same pattern:
```typescript
export function useTopicTrueFalseQuestions(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['true-false', 'topic', topicId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase.from('true_false_questions')
        .select('*').eq('topic_id', topicId!);
      if (!includeDeleted) query = query.eq('is_deleted', false);
      // ...
    },
    enabled: !!topicId,
  });
}
```

---

### Part 6: Update Bulk Import Edge Functions

**File:** `supabase/functions/bulk-import-mcqs/index.ts`

Accept and store `topic_id`:
```typescript
const { mcqs, moduleId, chapterId, topicId } = await req.json();

const records = mcqs.map((mcq) => ({
  module_id: moduleId,
  chapter_id: chapterId || null,
  topic_id: topicId || null,  // Add this
  // ...other fields
}));
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/module/BookFormModal.tsx` | Remove "Unit", "Section", "Part" from dropdown |
| `src/hooks/useMcqs.ts` | Add `useTopicMcqs` hook |
| `src/hooks/useTrueFalseQuestions.ts` | Add `useTopicTrueFalseQuestions` hook |
| `src/hooks/useOsceQuestions.ts` | Add `useTopicOsceQuestions` hook |
| `src/pages/TopicDetailPage.tsx` | Major refactor - use modern components, add Test section |
| `supabase/functions/bulk-import-mcqs/index.ts` | Support `topic_id` |

**Database Migration:**
- Add `topic_id` column to `mcqs` table
- Add `topic_id` column to `true_false_questions` table
- Add `topic_id` column to `osce_questions` table

---

## Result After Implementation

Both ChapterPage and TopicDetailPage will have:
- Identical admin toolbar (Select All, Bulk Import, Add, Cards/Table toggle)
- Same section navigation (Resources, Self Assessment, Test Yourself)
- Same content components (McqList, TrueFalseList, OsceList, etc.)
- Same bulk upload functionality
- Same mock exam/test features

Any feature or UI change made in one will automatically apply to the other.

---

## Testing Checklist

After implementation:
- [ ] Navigate to a Pharmacology topic (e.g., PHAR-108)
- [ ] Verify "Test Yourself" section appears in navigation
- [ ] Verify MCQ tab uses modern McqList with Cards/Table toggle
- [ ] Test adding a single MCQ via the Add button
- [ ] Test bulk CSV upload for MCQs
- [ ] Verify True/False tab appears and works
- [ ] Verify OSCE tab appears and works
- [ ] Compare UI side-by-side with Surgery chapter - should be identical
- [ ] Verify Add Department modal only shows "Chapter (Ch)" and "Lecture (Lec)"

