
# Phase 4-6: Admin Table Views with Multi-Select, Bulk Operations, and CSV Export

## Summary
Create a reusable admin table component and implement table views for all content types (Flashcards, Lectures, MCQs, OSCEs, Essays, Matching Questions). Each table includes multi-select checkboxes, inline section dropdown editing, bulk delete, CSV export, and a view toggle to switch between Card/Table views.

---

## Phase 4: Reusable ContentAdminTable Component

### New File: `src/components/admin/ContentAdminTable.tsx`

A generic table component that works with any content type:

**Features:**
- Header row with Select All checkbox
- Configurable columns via props
- Section badge column with inline dropdown for quick section assignment
- Actions column (Edit, Delete buttons)
- Integration with `BulkSectionAssignment` component
- Bulk Delete button using `useBulkDeleteContent` hook
- CSV Export button using `exportToCsv` utility

**Props Interface:**
```typescript
interface ContentAdminTableProps<T extends { id: string }> {
  data: T[];
  columns: {
    key: keyof T | 'actions';
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
  }[];
  contentTable: ContentTableName;
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  sections?: Section[];
  csvExportConfig?: {
    filename: string;
    columns: ExportColumn<T>[];
  };
}
```

---

## Phase 5: Verify Section Dropdowns in Edit Forms

All edit modals already include `SectionSelector`:
- `McqFormModal.tsx` - line 22, uses `SectionSelector`
- `OsceFormModal.tsx` - line 12, uses `SectionSelector`
- `MatchingQuestionFormModal.tsx` - line 29, uses `SectionSelector`
- `LectureList.tsx` (inline edit) - line 35, uses `SectionSelector`
- `StudyResourceFormModal.tsx` - already implemented

**Status: Complete - No changes needed**

---

## Phase 6: Content-Specific Admin Table Views

### 6A: Flashcards Admin Table
**New File: `src/components/study/FlashcardsAdminTable.tsx`**

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| Title | Deck title |
| Front | Question text (truncated to 50 chars) |
| Back | Answer text (truncated to 50 chars) |
| Section | Dropdown selector |
| Actions | Edit, Delete |

**Integration:** Update `FlashcardsTab.tsx` to add view toggle for admins

### 6B: Lectures Admin Table  
**New File: `src/components/content/LecturesAdminTable.tsx`**

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| Title | Lecture title |
| Duration | Video length |
| Source | YouTube/GDrive icon |
| Section | Dropdown selector |
| Actions | Edit, Delete |

**Integration:** Update `LectureList.tsx` or create wrapper with toggle

### 6C: MCQs Admin Table Enhancement
**Update: `src/components/content/McqList.tsx`**

Add view toggle button in admin controls:
- Card View (existing)
- Table View (new)

New table columns:
| Column | Description |
|--------|-------------|
| Checkbox | Already exists |
| # | Question number |
| Stem | Truncated question text |
| Difficulty | Badge (easy/medium/hard) |
| Section | Inline dropdown |
| Actions | Edit, Delete |

### 6D: OSCE Admin Table Enhancement
**Update: `src/components/content/OsceList.tsx`**

Similar to MCQ - add view toggle:
| Column | Description |
|--------|-------------|
| Checkbox | Already exists |
| # | Question number |
| History | Truncated history text |
| Image | Thumbnail preview |
| Section | Inline dropdown |
| Actions | Edit, Delete |

### 6E: Essays/Short Answer Admin Table
**New File: `src/components/content/EssaysAdminTable.tsx`**

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| Title | Question title |
| Question | Truncated text |
| Has Answer | Check/X icon |
| Section | Dropdown selector |
| Actions | Edit, Delete |

**Integration:** Update `EssayList.tsx` with toggle

### 6F: Matching Questions Admin Table
**New File: `src/components/content/MatchingAdminTable.tsx`**

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| Instruction | Truncated text |
| Pairs | Count of items |
| Difficulty | Badge |
| Section | Dropdown selector |
| Actions | Edit, Delete |

**Integration:** Update `MatchingQuestionList.tsx` with toggle

---

## Phase 9: View Toggle Component

### New File: `src/components/admin/AdminViewToggle.tsx`

Reusable toggle button group:
```typescript
interface AdminViewToggleProps {
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
}
```

Renders two buttons:
- Cards (LayoutGrid icon)
- Table (List icon)

Used by all list components when `isAdmin` is true.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/ContentAdminTable.tsx` | Reusable table component |
| `src/components/admin/AdminViewToggle.tsx` | View mode toggle buttons |
| `src/components/study/FlashcardsAdminTable.tsx` | Flashcard table view |
| `src/components/content/LecturesAdminTable.tsx` | Lecture table view |
| `src/components/content/EssaysAdminTable.tsx` | Essay table view |
| `src/components/content/MatchingAdminTable.tsx` | Matching question table view |

## Files to Update

| File | Changes |
|------|---------|
| `src/components/study/FlashcardsTab.tsx` | Add view toggle, render table when selected |
| `src/components/content/LectureList.tsx` | Add view toggle, render table when selected |
| `src/components/content/McqList.tsx` | Add view toggle, create inline table view |
| `src/components/content/OsceList.tsx` | Add view toggle, create inline table view |
| `src/components/content/EssayList.tsx` | Add view toggle, render table when selected |
| `src/components/content/MatchingQuestionList.tsx` | Add view toggle, render table when selected |

---

## Implementation Order

1. Create `AdminViewToggle.tsx` (simple, no dependencies)
2. Create `ContentAdminTable.tsx` (core reusable component)
3. Create individual table views (FlashcardsAdminTable, LecturesAdminTable, etc.)
4. Update list components to add view toggle and conditionally render table views
5. Add CSV export buttons to each table view
6. Test multi-select, bulk delete, and section assignment

---

## Technical Details

### Inline Section Dropdown
Each table row will have a section cell that renders a compact dropdown:
```tsx
<Select
  value={item.section_id || 'unassigned'}
  onValueChange={(v) => updateSection(item.id, v)}
>
  <SelectTrigger className="h-8 w-32">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    {sections.map(s => (
      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Bulk Delete Flow
1. User selects items via checkboxes
2. "Delete Selected" button appears when `selectedIds.size > 0`
3. Confirmation dialog shows count of items
4. On confirm, calls `useBulkDeleteContent` hook
5. UI refreshes via query invalidation

### CSV Export
Each table has an "Export CSV" button that:
1. Takes current filtered data
2. Maps through configured columns
3. Resolves section IDs to names using `sections` array
4. Downloads file via `exportToCsv` utility
