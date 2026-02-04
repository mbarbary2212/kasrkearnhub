
# Plan: Fix Missing True/False Tab Integration in ChapterPage

## Problem Summary
The True/False tab appears in the navigation (showing count "0") but clicking it displays nothing - no admin controls, no content, no empty state message. This is because the ChapterPage was not updated to integrate the True/False feature.

## Root Cause
The `ChapterPage.tsx` is missing several key integrations:

1. **Missing imports** - No import for `useChapterTrueFalseQuestions` hook or `TrueFalseList` component
2. **Missing data fetching** - The hook is never called to fetch True/False questions
3. **Missing tab count** - The `true_false` count is not passed to `createPracticeTabs()`
4. **Missing content block** - No `{practiceTab === 'true_false' && (...)}` rendering section

## Solution

### Phase 1: ChapterPage Integration

Update `src/pages/ChapterPage.tsx` to properly integrate True/False:

**1.1 Add imports:**
```typescript
import { useChapterTrueFalseQuestions } from '@/hooks/useTrueFalseQuestions';
import { TrueFalseList } from '@/components/content/TrueFalseList';
```

**1.2 Add data fetching (alongside other question hooks):**
```typescript
const { data: trueFalseQuestions, isLoading: trueFalseLoading } = useChapterTrueFalseQuestions(chapterId);
const { data: deletedTrueFalse } = useChapterTrueFalseQuestions(chapterId, true);
```

**1.3 Add state for deleted toggle:**
```typescript
const [showDeletedTrueFalse, setShowDeletedTrueFalse] = useState(false);
```

**1.4 Add deleted filter:**
```typescript
const deletedOnlyTrueFalse = (deletedTrueFalse || []).filter(q => q.is_deleted);
```

**1.5 Update `createPracticeTabs` call to include true_false count:**
```typescript
return createPracticeTabs({
  mcqs: mcqs?.length || 0,
  true_false: trueFalseQuestions?.length || 0,  // Add this line
  essays: essays?.length || 0,
  clinical_cases: clinicalCasesCount,
  osce: osceQuestions?.length || 0,
  practical: 0,
  matching: matchingQuestions?.length || 0,
  images: 0,
});
```

**1.6 Add content rendering block after MCQs section (around line 700):**
```typescript
{/* True/False Content */}
{practiceTab === 'true_false' && (
  <div>
    {trueFalseLoading ? (
      <QuestionListSkeleton count={2} type="mcq" />
    ) : (
      <TrueFalseList
        questions={filterBySection(trueFalseQuestions || [])}
        deletedQuestions={deletedOnlyTrueFalse}
        moduleId={moduleId || ''}
        chapterId={chapterId}
        isAdmin={canManageContent}
        showDeletedToggle={canManageContent}
        showDeleted={showDeletedTrueFalse}
        onShowDeletedChange={setShowDeletedTrueFalse}
      />
    )}
  </div>
)}
```

### Phase 2: Enhance TrueFalseList Component

The current `TrueFalseList` has minimal admin controls. Update it to match the MCQ list pattern with:

**2.1 Add missing props to interface:**
```typescript
interface TrueFalseListProps {
  questions: TrueFalseQuestion[];
  deletedQuestions?: TrueFalseQuestion[];
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  isAdmin: boolean;
  showDeletedToggle?: boolean;    // Add
  showDeleted?: boolean;          // Already exists
  onShowDeletedChange?: (show: boolean) => void;  // Add
}
```

**2.2 Add admin controls matching MCQ pattern:**
- Select all checkbox with multi-select state
- Assign Section button (using `BulkSectionAssignment` component)
- Bulk Import button
- Add Question button
- Cards/Table view toggle (using `AdminViewToggle` component)

**2.3 Add search and filter controls:**
- Search input for filtering by statement text
- Difficulty filter dropdown
- Marked (0) / Duplicates (0) / Deleted (0) toggle buttons

**2.4 Add count display:**
- Show filtered count like "20/20"

### Phase 3: Create TrueFalseAdminTable Component (Optional Enhancement)

Create `src/components/content/TrueFalseAdminTable.tsx` for the table view:
- Multi-select checkboxes in first column
- Statement column (truncated with tooltip)
- Answer column (True/False badge)
- Difficulty column
- Section dropdown for inline assignment
- Edit/Delete action buttons

This can be a follow-up enhancement after the core integration is working.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ChapterPage.tsx` | Add imports, data fetching, state, and rendering block |
| `src/components/content/TrueFalseList.tsx` | Add missing props and enhanced admin controls |

## Implementation Order

1. Fix ChapterPage.tsx integration (critical - makes tab work)
2. Add missing TrueFalseList props for deleted toggle
3. Enhance TrueFalseList with full admin controls (matching MCQ pattern)
4. Test end-to-end: tab click, empty state, add question, bulk upload

## Expected Outcome

After these changes:
- Clicking True/False tab will show the admin controls (Select all, Assign Section, Bulk Import, Add Question)
- Search and filter bar will be visible
- Cards/Table view toggle will work
- Empty state message will show when no questions exist
- Admin can add single questions via form modal
- Admin can bulk upload via CSV
- Section assignment will work via dropdown
