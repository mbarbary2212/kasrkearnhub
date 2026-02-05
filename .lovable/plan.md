

# Plan: Add Multi-Select and Bulk Operations to All Content Types

## Overview
Implement consistent multi-select functionality with bulk operations (delete, assign section, etc.) across all content tabs in admin views: Videos/Lectures, Flashcards, MCQs, OSCE, True/False, Essays, Clinical Cases, and Matching Questions.

## Current State Analysis

| Content Type | Multi-Select | Bulk Delete | Bulk Section Assign | Table View |
|--------------|--------------|-------------|---------------------|------------|
| MCQs | Yes | Yes | Yes | Yes |
| OSCE | Yes | No (via table) | Yes | No |
| True/False | Yes | No | Yes | Yes |
| Lectures | No | No | Via table only | Yes |
| Flashcards | No | No | Via table only | Yes |
| Essays | No | No | No | No |
| Clinical Cases | Yes | No | Yes | No |
| Matching Questions | Partial | No | No | No |

## Implementation Strategy

The existing `ContentAdminTable` component already provides excellent bulk functionality:
- Multi-select with "Select All" checkbox
- Bulk delete with confirmation dialog
- Inline section assignment via dropdown
- CSV export

The solution is to ensure all content types:
1. Have a **Table View** option with `ContentAdminTable`
2. In **Cards View**, add consistent multi-select controls matching the MCQ/OSCE pattern
3. Wire up `BulkSectionAssignment` component for bulk section tagging
4. Add bulk delete capability where missing

---

## Phase 1: Enhance ContentAdminTable with More Bulk Actions

Update `src/components/admin/ContentAdminTable.tsx` to add a bulk section assignment button to the toolbar (currently it only has bulk delete).

**Changes:**
- Add `BulkSectionAssignment` component to the toolbar when items are selected
- Add the `contentTable` to the BulkSectionAssignment call

```typescript
// In toolbar section, after bulk delete button:
{selectedIds.size > 0 && sections.length > 0 && (
  <BulkSectionAssignment
    chapterId={chapterId}
    topicId={topicId}
    selectedIds={Array.from(selectedIds)}
    contentTable={contentTable}
    onComplete={clearSelection}
  />
)}
```

---

## Phase 2: Lectures - Add Multi-Select in Cards View

Currently `LectureList.tsx` only has multi-select in Table View via `LecturesAdminTable`. Add multi-select to Cards View.

**File:** `src/components/content/LectureList.tsx`

**Changes:**
1. Add state for `selectedIds` (Set<string>)
2. Add `toggleSelection`, `selectAll`, `clearSelection` callbacks
3. Add admin toolbar with:
   - Select All checkbox
   - "X selected" indicator
   - Clear button
   - BulkSectionAssignment component
   - Bulk Delete button with confirmation dialog
4. Add checkbox to each lecture card row

---

## Phase 3: Flashcards - Add Multi-Select Controls

Currently `FlashcardsTab.tsx` shows either Cards or Table view for admins. The Table view has multi-select via `ContentAdminTable`, but Cards view (`FlashcardsAdminGrid`) does not.

**Option A (Recommended):** Add a wrapper component with selection controls above the grid/table.

**File:** `src/components/study/FlashcardsTab.tsx`

**Changes:**
1. Add state for `selectedIds` 
2. Add admin toolbar with multi-select controls when in Cards view
3. Pass selection state to `FlashcardsAdminGrid`
4. Add checkbox rendering to each flashcard group card

**File:** `src/components/study/FlashcardsAdminGrid.tsx`

**Changes:**
1. Add `selectedIds` and `onToggleSelection` props
2. Add checkbox to each deck group header

---

## Phase 4: Essays - Create Admin Table and Controls

Essays currently have no admin table view or multi-select.

**Files to Create:**
- `src/components/content/EssaysAdminTable.tsx` - Table view using `ContentAdminTable`

**File:** `src/components/content/EssayList.tsx` (Update)

**Changes:**
1. Add admin view mode toggle (Cards/Table)
2. Add multi-select state and controls
3. Add `BulkSectionAssignment` component
4. Add bulk delete with confirmation
5. Import and render `EssaysAdminTable` when in table view

---

## Phase 5: Matching Questions - Complete Multi-Select

**File:** `src/components/content/MatchingQuestionList.tsx`

Verify and ensure:
1. Multi-select state exists
2. Select All checkbox in toolbar
3. BulkSectionAssignment component wired up
4. Bulk delete with confirmation

---

## Phase 6: Update useContentBulkOperations Hook

**File:** `src/hooks/useContentBulkOperations.ts`

Add missing table entries to `ContentTableName` and `QUERY_INVALIDATION_MAP`:

```typescript
export type ContentTableName = 
  | 'lectures'
  | 'resources'
  | 'study_resources'
  | 'mcqs'
  | 'essays'
  | 'clinical_cases'
  | 'osce_questions'
  | 'matching_questions'
  | 'virtual_patient_cases'
  | 'true_false_questions';  // Add if not present

const QUERY_INVALIDATION_MAP: Record<ContentTableName, string[]> = {
  // ... existing entries
  true_false_questions: ['true_false'],  // Add
};
```

---

## Implementation Files Summary

| File | Action | Priority |
|------|--------|----------|
| `src/components/admin/ContentAdminTable.tsx` | Add BulkSectionAssignment to toolbar | High |
| `src/components/content/LectureList.tsx` | Add multi-select in cards view | High |
| `src/components/study/FlashcardsTab.tsx` | Add multi-select controls wrapper | High |
| `src/components/study/FlashcardsAdminGrid.tsx` | Add checkbox to deck groups | High |
| `src/components/content/EssaysAdminTable.tsx` | Create new table component | Medium |
| `src/components/content/EssayList.tsx` | Add admin controls and table view | Medium |
| `src/components/content/MatchingQuestionList.tsx` | Complete multi-select setup | Medium |
| `src/hooks/useContentBulkOperations.ts` | Add missing table types | High |

---

## UI Pattern Reference

All admin list views should follow this consistent pattern:

```text
+------------------------------------------------------------------+
| [✓] Select all  |  3 selected  | [Clear] | [Assign Section ▾] | [🗑 Delete] | [⬇ Export CSV] |  [Cards/Table Toggle] |
+------------------------------------------------------------------+
```

When items are selected:
- Show count: "3 selected"
- Show Clear button
- Show Assign Section popover (uses BulkSectionAssignment)
- Show Delete button (opens confirmation dialog)
- Show Export CSV (exports selected or all)

---

## Technical Details

### Multi-Select State Pattern
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelection = useCallback((id: string, checked: boolean) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  });
}, []);

const selectAll = useCallback(() => {
  setSelectedIds(new Set(filteredItems.map(item => item.id)));
}, [filteredItems]);

const clearSelection = useCallback(() => {
  setSelectedIds(new Set());
}, []);
```

### Admin Toolbar Pattern
```tsx
{isAdmin && (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <Checkbox 
      checked={selectedIds.size > 0 && selectedIds.size === items.length}
      onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
    />
    <span className="text-sm text-muted-foreground">
      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
    </span>
    {selectedIds.size > 0 && (
      <>
        <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
        <BulkSectionAssignment
          chapterId={chapterId}
          selectedIds={Array.from(selectedIds)}
          contentTable="lectures"
          onComplete={clearSelection}
        />
        <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </>
    )}
  </div>
)}
```

---

## Testing Checklist

After implementation, verify for each content type:
- [ ] Select individual items via checkbox
- [ ] Select all via header checkbox
- [ ] Clear selection works
- [ ] Bulk assign section updates all selected items
- [ ] Bulk delete soft-deletes all selected items
- [ ] Selection persists when switching between cards/table view (optional)
- [ ] Export CSV works with selection (if applicable)
- [ ] Multi-select controls hidden for students

