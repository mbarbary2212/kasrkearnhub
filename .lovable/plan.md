
# Universal Admin Content Management with Section Tagging

## Overview
Extend the admin table view, bulk operations, CSV export/import with section tagging, and dropdown-based section assignment to **all content types** across the platform. This creates a consistent admin experience while keeping the Test tab unchanged.

---

## Content Types Covered

| Tab | Content Type | Database Table | Currently Has Table View |
|-----|-------------|----------------|-------------------------|
| **Resources** | Lectures/Videos | `lectures` | No (list view) |
| **Resources** | Flashcards | `study_resources` | No (card grid) |
| **Resources** | Mind Maps | `study_resources` | No |
| **Resources** | Guided Explanations | `study_resources` | No |
| **Resources** | Reference Materials | `resources` + `study_resources` | No |
| **Practice** | MCQs | `mcqs` | Partial (has checkboxes) |
| **Practice** | Short Answer | `essays` | No |
| **Practice** | Clinical Cases | `clinical_cases` | No |
| **Practice** | OSCE | `osce_questions` | Partial (has checkboxes) |
| **Practice** | Matching | `matching_questions` | No |

**Test tab**: Unchanged (uses full chapter scope, no section filtering)

---

## Phase 1: Add Section Number to Sections Table

**Database Migration:**
Add `section_number` column to sections table for easier reference:

```sql
ALTER TABLE sections 
ADD COLUMN section_number INTEGER;

-- Auto-populate based on display_order for existing sections
UPDATE sections 
SET section_number = display_order 
WHERE section_number IS NULL;
```

**Update Section interface:**
```typescript
export interface Section {
  id: string;
  name: string;
  section_number: number | null;  // ADD
  chapter_id: string | null;
  topic_id: string | null;
  display_order: number;
  created_at: string;
}
```

---

## Phase 2: Dynamic Template Schema System

**File: `src/components/admin/HelpTemplatesTab.tsx`**

Replace hardcoded templates with a centralized schema that auto-generates templates:

```typescript
const TEMPLATE_SCHEMAS = {
  flashcard: {
    columns: ['title', 'front', 'back', 'section_name', 'section_number'],
    required: ['title', 'front', 'back'],
    optional: ['section_name', 'section_number'],
    examples: [
      ['Card Title', 'Question text', 'Answer text', 'Heart Basics', '1']
    ],
  },
  mcq: {
    columns: ['stem', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE', 
              'correct_key', 'explanation', 'difficulty', 'section_name', 'section_number'],
    required: ['stem', 'choiceA', 'choiceB', 'correct_key'],
    optional: ['choiceC', 'choiceD', 'choiceE', 'explanation', 'difficulty', 'section_name', 'section_number'],
    examples: [...],
  },
  // ... all other types
};

function generateTemplateFromSchema(templateId: string): string {
  const schema = TEMPLATE_SCHEMAS[templateId];
  // Auto-generate CSV/XLSX from schema
}
```

**Benefits:**
- Single source of truth for column definitions
- Templates auto-update when schema changes
- Adding section tagging only requires updating TEMPLATE_SCHEMAS

---

## Phase 3: Section-Aware Bulk Upload

**All bulk upload modals will:**
1. Accept `section_name` OR `section_number` as optional columns
2. Use dropdown for section selection (not freehand text)
3. Resolve names/numbers to section IDs before import

**Section Resolution Logic:**
```typescript
function resolveSectionId(
  sections: Section[],
  sectionName?: string,
  sectionNumber?: number
): string | null {
  if (sectionNumber) {
    const match = sections.find(s => s.section_number === sectionNumber);
    if (match) return match.id;
  }
  if (sectionName) {
    const match = sections.find(s => 
      s.name.toLowerCase().trim() === sectionName.toLowerCase().trim()
    );
    if (match) return match.id;
  }
  return null;
}
```

**Files to update:**
- `StudyBulkUploadModal.tsx` - flashcards, tables, algorithms, exam tips
- `McqList.tsx` (bulk upload section) - MCQs
- `OsceBulkUploadModal.tsx` - OSCE questions
- `MatchingQuestionBulkUploadModal.tsx` - Matching questions

---

## Phase 4: Reusable Admin Table Component

**New File: `src/components/admin/ContentAdminTable.tsx`**

A generic, reusable table component for all content types:

```typescript
interface ContentAdminTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  chapterId?: string;
  topicId?: string;
  contentTable: ContentTableName;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onExportCsv?: () => void;
  sections?: Section[];
}
```

**Features:**
- Checkbox column for multi-select
- Select All / Clear selection
- Section badge column with dropdown for inline editing
- Actions column (Edit, Delete)
- CSV Export button
- Integrates with `BulkSectionAssignment` and bulk delete

**Column structure:**
```text
+----------+---------------+------------------+-----------+---------+
| Checkbox | Title/Stem    | Preview          | Section   | Actions |
+----------+---------------+------------------+-----------+---------+
```

---

## Phase 5: Section Dropdown in Edit Forms

**All edit modals/forms will use `SectionSelector` dropdown:**

Already implemented in:
- `LectureList.tsx` (edit modal)
- `StudyResourceFormModal.tsx`

Need to add/verify in:
- `McqFormModal.tsx`
- `OsceFormModal.tsx`
- `EssayFormModal.tsx` (if exists, or add)
- `MatchingQuestionFormModal.tsx`
- `ClinicalCaseFormModal.tsx`

The SectionSelector already uses a dropdown with chapter sections - no freehand text allowed.

---

## Phase 6: Content-Specific Table Views

### 6A: Flashcards Admin Table
**File: `src/components/study/FlashcardsAdminTable.tsx`**

| Checkbox | Title | Front (truncated) | Back (truncated) | Section | Actions |
|----------|-------|-------------------|------------------|---------|---------|

### 6B: MCQs Table Enhancement
**File: `src/components/content/McqList.tsx`**

Already has checkboxes - add:
- Table view toggle (Grid vs Table)
- CSV export with section_name column
- Inline section dropdown

### 6C: OSCE Table Enhancement
**File: `src/components/content/OsceList.tsx`**

Already has checkboxes - add:
- Table view toggle
- CSV export
- Inline section dropdown

### 6D: Lectures Admin Table
**New File: `src/components/content/LecturesAdminTable.tsx`**

| Checkbox | Title | Duration | Video Source | Section | Actions |
|----------|-------|----------|--------------|---------|---------|

### 6E: Essays/Short Answer Admin Table
**New File: `src/components/content/EssaysAdminTable.tsx`**

| Checkbox | Title | Question (truncated) | Section | Actions |
|----------|-------|---------------------|---------|---------|

### 6F: Matching Questions Admin Table
**New File: `src/components/content/MatchingAdminTable.tsx`**

| Checkbox | Title | Pairs Count | Section | Actions |
|----------|-------|-------------|---------|---------|

---

## Phase 7: Bulk Delete Hook

**File: `src/hooks/useContentBulkOperations.ts`**

Generic bulk operations hook for all content types:

```typescript
export function useBulkDeleteContent(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from(tableName)
        .update({ is_deleted: true, updated_by: userData.user?.id })
        .in('id', ids);
      if (error) throw error;
      return { ids };
    },
    onSuccess: () => {
      // Invalidate relevant queries based on table name
      queryClient.invalidateQueries({ 
        predicate: (q) => shouldInvalidate(q, tableName) 
      });
    },
  });
}
```

---

## Phase 8: CSV Export Functionality

**File: `src/lib/csvExport.ts`**

Generic CSV export utility:

```typescript
export async function exportContentToCsv<T>(
  items: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sections?: Section[]
) {
  // Generate CSV with section names resolved
  // Download as file
}
```

**Export format matches import template for round-trip editing:**
- Flashcards: `title,front,back,section_name,section_number`
- MCQs: `stem,choiceA,...,section_name,section_number`
- OSCE: `image_filename,history_text,...,section_name,section_number`

---

## Phase 9: View Toggle in Tab Components

Each content tab gets an admin view toggle:

```tsx
{isAdmin && (
  <div className="flex gap-2 mb-4">
    <Button 
      variant={viewMode === 'cards' ? 'default' : 'outline'} 
      size="sm"
      onClick={() => setViewMode('cards')}
    >
      <Grid className="w-4 h-4 mr-1" /> Cards
    </Button>
    <Button 
      variant={viewMode === 'table' ? 'default' : 'outline'} 
      size="sm"
      onClick={() => setViewMode('table')}
    >
      <List className="w-4 h-4 mr-1" /> Table
    </Button>
  </div>
)}
```

---

## Phase 10: Update useBulkCreateStudyResources

**File: `src/hooks/useStudyResources.ts`**

Fix the missing `section_id` in bulk create:

```typescript
const resourcesWithUser = resources.map((r) => ({
  module_id: r.module_id,
  chapter_id: r.chapter_id,
  title: r.title,
  resource_type: r.resource_type,
  content: r.content,
  section_id: r.section_id || null,  // ADD THIS
  created_by: user?.id,
}));
```

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | New migration | Add section_number to sections table |
| 1 | `src/hooks/useSections.ts` | Update Section interface |
| 2 | `src/components/admin/HelpTemplatesTab.tsx` | Implement TEMPLATE_SCHEMAS, add missing handlers |
| 3 | `src/components/study/StudyBulkUploadModal.tsx` | Add section_name/section_number parsing |
| 3 | MCQ/OSCE/Matching bulk modals | Add section column support |
| 4 | `src/components/admin/ContentAdminTable.tsx` | New reusable table component |
| 5 | Various form modals | Ensure SectionSelector is used |
| 6 | Multiple new table components | FlashcardsAdminTable, LecturesAdminTable, etc. |
| 7 | `src/hooks/useContentBulkOperations.ts` | New bulk delete hook |
| 8 | `src/lib/csvExport.ts` | New CSV export utility |
| 9 | Tab components | Add view toggle for admins |
| 10 | `src/hooks/useStudyResources.ts` | Fix section_id in bulk create |

---

## Technical Notes

### Section Resolution Priority
1. If `section_number` provided → match by number
2. Else if `section_name` provided → match by name (case-insensitive)
3. Else → null (unassigned)

### Test Tab Unchanged
The Test Yourself section always uses full chapter/topic scope regardless of section filters. No changes needed.

### Dropdown-Only Section Tagging
All section assignment UI uses the `SectionSelector` dropdown component:
- In edit modals/forms
- In table inline editing
- In bulk assignment popover

No freehand text entry for section names - ensures consistency.

### CSV Round-Trip Workflow
1. Admin exports existing content to CSV
2. Edits in Excel/Google Sheets
3. Re-imports with section assignments
4. Same format for export and import
