

# Complete Admin Content Management System - Remaining Work

## Summary

This plan completes the remaining phases of the Universal Admin Content Management System by adding table views with bulk operations to MCQs, OSCEs, and Clinical Cases (Virtual Patients), and also investigates the flashcard section tagging issue you reported.

---

## Issues Identified

### 1. MCQs and OSCEs Missing Table View Toggle
**Status**: MCQList and OsceList were not updated with the `AdminViewToggle` component and table view like Flashcards, Lectures, Essays, and Matching Questions.

### 2. Clinical Cases Missing Section Tagging
**Status**: `ClinicalCaseAdminList.tsx` lacks multi-select checkboxes and bulk section assignment capability.

### 3. Flashcard Section Tagging Investigation
**Status**: Database shows flashcards ARE being correctly assigned to sections. Looking at the "Arterial Disorders" chapter:
- Sections exist: Vascular imaging (0), Acute Ischemia (1), Chronic ischemia (2), Arterial trauma (3), Gangrene (4), Diabetic foot (5), etc.
- Flashcards are assigned to correct sections (Acute Ischemia, Chronic ischemia, Arterial trauma, Aneurysms AAA, etc.)

**Possible causes of perceived issue:**
- CSV file may have used incorrect section_number values
- Section names in CSV may not have matched exactly (case-sensitive mismatch)
- UI may not be properly displaying the section filter badges

---

## Implementation Plan

### Phase A: MCQ Table View with Section Management

**Update**: `src/components/content/McqList.tsx`

Add admin view toggle similar to FlashcardsTab:
- Import `AdminViewToggle` and `ViewMode` from `@/components/admin/AdminViewToggle`
- Add `viewMode` state for admin users
- Render table view when `viewMode === 'table'`

**Create**: `src/components/content/McqAdminTable.tsx`

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| # | Question number |
| Stem | Truncated to 60 chars |
| Difficulty | Badge (easy/medium/hard) |
| Section | Inline dropdown selector |
| Actions | Edit, Delete |

Features:
- Uses `ContentAdminTable` base component
- Inline section editing via dropdown
- Bulk delete with confirmation
- CSV export with section columns

---

### Phase B: OSCE Table View with Section Management

**Update**: `src/components/content/OsceList.tsx`

Add admin view toggle:
- Import `AdminViewToggle` component
- Add `viewMode` state
- Conditionally render table vs card view

**Create**: `src/components/content/OsceAdminTable.tsx`

| Column | Description |
|--------|-------------|
| Checkbox | Multi-select |
| # | Question number |
| History | Truncated history text |
| Image | Thumbnail preview |
| Section | Inline dropdown |
| Actions | Edit, Delete |

---

### Phase C: Clinical Cases Section Tagging

**Update**: `src/components/clinical-cases/ClinicalCaseAdminList.tsx`

Add bulk section assignment:
- Multi-select checkboxes on each case card
- Import `BulkSectionAssignment` component
- Add selection state management
- Show selection count and bulk actions toolbar

Note: Clinical Cases don't need a separate table view since the card layout with image/stages is more appropriate, but they DO need section bulk tagging capability.

---

### Phase D: Flashcard Section Display Verification

**Verify**: Ensure section badges are visible in the flashcard student view

**Check**: `FlashcardsStudentView.tsx` and `FlashcardsSlideshowMode.tsx` for section filtering

If sections are not being displayed:
- Add section badge to flashcard card display
- Add section filter dropdown to slideshow mode settings

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/content/McqAdminTable.tsx` | MCQ table view with sections |
| `src/components/content/OsceAdminTable.tsx` | OSCE table view with sections |

## Files to Update

| File | Changes |
|------|---------|
| `src/components/content/McqList.tsx` | Add view toggle, render table when selected |
| `src/components/content/OsceList.tsx` | Add view toggle, render table when selected |
| `src/components/clinical-cases/ClinicalCaseAdminList.tsx` | Add multi-select and bulk section assignment |

---

## Technical Details

### MCQ Table Columns Configuration

```typescript
const columns: ColumnConfig<Mcq>[] = [
  { key: 'select', header: '', className: 'w-10' },
  { 
    key: 'stem', 
    header: 'Question',
    render: (item) => (
      <span className="line-clamp-2 max-w-[300px]">{item.stem}</span>
    )
  },
  {
    key: 'difficulty',
    header: 'Difficulty',
    render: (item) => (
      <Badge variant={item.difficulty === 'hard' ? 'destructive' : 'secondary'}>
        {item.difficulty}
      </Badge>
    )
  },
  { key: 'section', header: 'Section', className: 'w-32' },
  { key: 'actions', header: '', className: 'w-20' },
];
```

### Clinical Case Bulk Selection

```tsx
// Add to ClinicalCaseAdminList
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Selection controls in toolbar
<BulkSectionAssignment
  chapterId={chapterId}
  selectedIds={Array.from(selectedIds)}
  contentTable="virtual_patient_cases"
  onComplete={clearSelection}
/>
```

---

## Regarding Your Flashcard Section Issue

Based on database analysis, the flashcard sections ARE being saved correctly. The flashcards in the "Arterial Disorders" chapter show proper section assignments:

- "Arteries blood type" -> Acute Ischemia (section 1)
- "Digital Subtraction Angiography" -> Chronic ischemia (section 2)
- "Acute Limb Ischemia" -> Arterial trauma (section 3)
- "Aneurysmal Diseases" -> Aneurysms, AAA (section 7)

If flashcards appeared in the wrong sections, possible causes:
1. **CSV section_number mismatch**: The section_number in your CSV may not match the actual section numbers in the database
2. **Case sensitivity**: Section names must match exactly (e.g., "Chronic ischemia" vs "Chronic Ischemia")
3. **Section 0 edge case**: Section with section_number=0 (Vascular imaging modalities) might cause matching issues

**Recommendation**: Use the Table view once implemented to verify/fix section assignments inline using the dropdown.

