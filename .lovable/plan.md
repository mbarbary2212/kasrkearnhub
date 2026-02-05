
# Plan: Add Table View Toggle to MCQ, True/False, OSCE, Mind Maps, and Guided Explanations

## Problem Summary
Several content types have incomplete table view implementations:
- **MCQs**: Has `AdminViewToggle` + `McqAdminTable` but never renders the table
- **True/False**: Has `AdminViewToggle` but no `TrueFalseAdminTable` component exists
- **OSCE**: Has `OsceAdminTable` but no toggle and it's not used in `OsceList`
- **Mind Maps**: No table view option at all
- **Guided Explanations**: No table view option at all

Meanwhile, **Videos/Lectures** and **Flashcards** work correctly because they properly conditionally render their table views based on `viewMode`.

---

## Solution

### Phase 1: Fix MCQ Table View (Currently Broken)

**File**: `src/components/content/McqList.tsx`

Add conditional rendering to show `McqAdminTable` when `viewMode === 'table'`:

```typescript
// After the filters/search section, replace the current card rendering with:
{viewMode === 'table' && isAdmin && !showDeleted ? (
  <McqAdminTable
    mcqs={filteredMcqs}
    sections={sections}
    chapterId={chapterId ?? undefined}
    topicId={topicId ?? undefined}
    moduleId={moduleId}
    onEdit={(mcq) => setEditingMcq(mcq)}
    onDelete={(mcq) => setDeletingMcq(mcq)}
  />
) : (
  // Existing cards view
)}
```

---

### Phase 2: Create TrueFalseAdminTable Component

**Create File**: `src/components/content/TrueFalseAdminTable.tsx`

New component using `ContentAdminTable` pattern (similar to `McqAdminTable`):

```typescript
import { Badge } from '@/components/ui/badge';
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import type { TrueFalseQuestion } from '@/hooks/useTrueFalseQuestions';
import type { Section } from '@/hooks/useSections';

interface TrueFalseAdminTableProps {
  questions: TrueFalseQuestion[];
  sections?: Section[];
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  onEdit: (question: TrueFalseQuestion) => void;
  onDelete: (question: TrueFalseQuestion) => void;
}

export function TrueFalseAdminTable({ ... }) {
  const columns: ColumnConfig<TrueFalseQuestion>[] = [
    { key: 'select', header: '', className: 'w-10' },
    { key: 'statement', header: 'Statement', render: (q) => <span className="line-clamp-2">{q.statement}</span> },
    { key: 'correct_answer', header: 'Answer', className: 'w-20', render: (q) => <Badge>{q.correct_answer ? 'True' : 'False'}</Badge> },
    { key: 'difficulty', header: 'Difficulty', className: 'w-24' },
    { key: 'section', header: 'Section', className: 'w-32' },
    { key: 'actions', header: '', className: 'w-24' },
  ];

  return <ContentAdminTable ... />;
}
```

**Update File**: `src/components/content/TrueFalseList.tsx`

Add conditional rendering for table view (similar to MCQ fix).

---

### Phase 3: Add Table View Toggle to OSCE

**File**: `src/components/content/OsceList.tsx`

1. Import `AdminViewToggle` and `OsceAdminTable`
2. Add `viewMode` state
3. Add the toggle to the admin toolbar
4. Conditionally render `OsceAdminTable` when `viewMode === 'table'`

```typescript
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { OsceAdminTable } from './OsceAdminTable';
import { useChapterSections, useTopicSections } from '@/hooks/useSections';

// Add state
const [viewMode, setViewMode] = useState<ViewMode>('cards');
const { data: sections = [] } = useChapterSections(chapterId);

// Add to toolbar
<AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

// Conditional rendering
{viewMode === 'table' && isAdmin ? (
  <OsceAdminTable
    questions={filteredQuestions}
    sections={sections}
    chapterId={chapterId}
    topicId={topicId}
    moduleId={moduleId}
    onEdit={handleEdit}
    onDelete={(q) => setDeleteConfirmId(q.id)}
  />
) : (
  // Existing cards view
)}
```

---

### Phase 4: Add Table View to Mind Maps

**Create File**: `src/components/study/MindMapAdminTable.tsx`

New admin table for mind maps:

```typescript
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import { StudyResource, MindMapContent } from '@/hooks/useStudyResources';
import { FileText, Network, Image } from 'lucide-react';

interface MindMapAdminTableProps {
  resources: StudyResource[];
  chapterId?: string;
  onEdit: (resource: StudyResource) => void;
  onDelete: (resource: StudyResource) => void;
}

export function MindMapAdminTable({ ... }) {
  const columns: ColumnConfig<StudyResource>[] = [
    { key: 'select', header: '', className: 'w-10' },
    { key: 'title', header: 'Title' },
    { 
      key: 'content', 
      header: 'Type', 
      render: (r) => {
        const content = r.content as MindMapContent;
        const isPdf = content.imageUrl?.endsWith('.pdf');
        const isNodeBased = !content.imageUrl && content.nodes?.length > 0;
        return isPdf ? <FileText /> : isNodeBased ? <Network /> : <Image />;
      }
    },
    { key: 'section', header: 'Section', className: 'w-32' },
    { key: 'actions', header: '', className: 'w-24' },
  ];

  return <ContentAdminTable data={resources} columns={columns} contentTable="study_resources" ... />;
}
```

**Update File**: `src/components/study/MindMapViewer.tsx`

Add `AdminViewToggle` and conditional table rendering.

---

### Phase 5: Add Table View to Guided Explanations

**Create File**: `src/components/study/GuidedExplanationAdminTable.tsx`

New admin table for guided explanations:

```typescript
import { ContentAdminTable, ColumnConfig } from '@/components/admin/ContentAdminTable';
import { StudyResource, GuidedExplanationContent } from '@/hooks/useStudyResources';
import { Badge } from '@/components/ui/badge';

interface GuidedExplanationAdminTableProps {
  resources: StudyResource[];
  chapterId?: string;
  onEdit: (resource: StudyResource) => void;
  onDelete: (id: string) => void;
}

export function GuidedExplanationAdminTable({ ... }) {
  const columns: ColumnConfig<StudyResource>[] = [
    { key: 'select', header: '', className: 'w-10' },
    { key: 'title', header: 'Title' },
    { 
      key: 'content', 
      header: 'Questions',
      render: (r) => {
        const content = r.content as GuidedExplanationContent;
        return <Badge variant="secondary">{content.guided_questions?.length || 0}</Badge>;
      }
    },
    { key: 'section', header: 'Section', className: 'w-32' },
    { key: 'actions', header: '', className: 'w-24' },
  ];

  return <ContentAdminTable data={resources} columns={columns} contentTable="study_resources" ... />;
}
```

**Update File**: `src/components/study/GuidedExplanationList.tsx`

Add `canManage` prop check, `AdminViewToggle`, and conditional table rendering.

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/content/TrueFalseAdminTable.tsx` | Admin table for True/False questions |
| `src/components/study/MindMapAdminTable.tsx` | Admin table for mind maps |
| `src/components/study/GuidedExplanationAdminTable.tsx` | Admin table for guided explanations |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/content/McqList.tsx` | Add conditional table view rendering |
| `src/components/content/TrueFalseList.tsx` | Import new table, add conditional rendering |
| `src/components/content/OsceList.tsx` | Import toggle + table, add viewMode state |
| `src/components/study/MindMapViewer.tsx` | Add toggle and table view option |
| `src/components/study/GuidedExplanationList.tsx` | Add toggle and table view option |

---

## Implementation Pattern

All components should follow this consistent pattern:

```typescript
// 1. Import
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { XxxAdminTable } from './XxxAdminTable';

// 2. State
const [viewMode, setViewMode] = useState<ViewMode>('cards');

// 3. Toolbar (admin only)
{isAdmin && <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />}

// 4. Conditional rendering
{viewMode === 'table' && isAdmin ? (
  <XxxAdminTable ... />
) : (
  <ExistingCardsView ... />
)}
```

---

## Testing Checklist

After implementation, verify for each content type:
- [ ] Cards/Table toggle is visible for admins
- [ ] Clicking "Table" shows the table view
- [ ] Clicking "Cards" returns to card view
- [ ] Multi-select works in table view
- [ ] Bulk section assignment works in table view
- [ ] Edit/Delete actions work from table view
- [ ] Students only see cards view (no toggle)
