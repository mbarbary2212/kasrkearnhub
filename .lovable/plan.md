
# Plan: Implement True/False Question Type

## Overview
Add a complete True/False question type following the existing MCQ patterns. This includes database tables, CRUD hooks, student/admin UI components, CSV bulk upload, AI generation integration, analytics, and test mode support.

## Phase 1: Database Schema

### 1.1 Create `true_false_questions` Table
```sql
CREATE TABLE true_false_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES module_chapters(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  statement TEXT NOT NULL,
  correct_answer BOOLEAN NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  display_order INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tf_module ON true_false_questions(module_id);
CREATE INDEX idx_tf_chapter ON true_false_questions(chapter_id);
CREATE INDEX idx_tf_section ON true_false_questions(section_id);
CREATE INDEX idx_tf_not_deleted ON true_false_questions(is_deleted) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE true_false_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching MCQ pattern)
CREATE POLICY "Students can read non-deleted questions"
  ON true_false_questions FOR SELECT
  USING (NOT is_deleted);

CREATE POLICY "Admins can manage all"
  ON true_false_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('platform_admin', 'super_admin', 'admin', 'department_admin')
    )
  );
```

### 1.2 Create `tf_analytics` Table (for future analytics)
```sql
CREATE TABLE tf_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tf_id UUID NOT NULL REFERENCES true_false_questions(id) ON DELETE CASCADE,
  module_id UUID NOT NULL,
  chapter_id UUID,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  facility_index NUMERIC(5,4),
  is_flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[],
  flag_severity TEXT CHECK (flag_severity IN ('low', 'medium', 'high', 'critical')),
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Frontend Infrastructure

### 2.1 Validation Schema (`src/lib/validators.ts`)
Add True/False validation schema:
```typescript
export const TrueFalseFormSchema = z.object({
  statement: z.string()
    .min(10, 'Statement must be at least 10 characters')
    .max(3000, 'Statement is too long (max 3000 characters)'),
  correct_answer: z.boolean(),
  explanation: z.string()
    .max(2000, 'Explanation is too long (max 2000 characters)')
    .nullable()
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'])
    .nullable()
    .optional(),
});

export type ValidatedTrueFalse = z.infer<typeof TrueFalseFormSchema>;
```

### 2.2 Tab Configuration (`src/config/tabConfig.ts`)
Add `true_false` to Practice tabs:
```typescript
import { ToggleLeft } from 'lucide-react';

export type PracticeTabId = 'mcqs' | 'true_false' | 'essays' | 'clinical_cases' | 'osce' | 'practical' | 'matching' | 'images';

export const PRACTICE_TABS: TabConfig[] = [
  { id: 'mcqs', label: 'MCQs', icon: HelpCircle },
  { id: 'true_false', label: 'True/False', icon: ToggleLeft },
  { id: 'essays', label: 'Short Answer', icon: PenTool },
  // ... rest unchanged
];

export function createPracticeTabs(counts: {
  mcqs?: number;
  true_false?: number;
  essays?: number;
  // ... rest
}): TabWithCount[]
```

---

## Phase 3: Hook Implementation

### 3.1 Create `src/hooks/useTrueFalseQuestions.ts`
Following the exact pattern from `useMcqs.ts`:

| Function | Purpose |
|----------|---------|
| `TrueFalseQuestion` interface | Type definition |
| `TrueFalseFormData` interface | Form data type |
| `useModuleTrueFalseQuestions(moduleId, includeDeleted)` | Fetch by module |
| `useChapterTrueFalseQuestions(chapterId, includeDeleted)` | Fetch by chapter |
| `useCreateTrueFalseQuestion()` | Create mutation |
| `useUpdateTrueFalseQuestion()` | Update mutation |
| `useDeleteTrueFalseQuestion()` | Soft delete mutation |
| `useRestoreTrueFalseQuestion()` | Restore mutation |
| `useBulkCreateTrueFalseQuestions()` | Bulk create via edge function |
| `parseTrueFalseCsv()` | CSV parser function |

---

## Phase 4: Student-Facing Components

### 4.1 Create `src/components/content/TrueFalseCard.tsx`
Interactive card with:
- Statement display
- Two large buttons: "TRUE" and "FALSE"
- Submit button to check answer
- Correct/incorrect feedback with color coding
- Explanation reveal after answering
- Integration with `useMarkItemComplete` for progress
- Integration with `useSaveQuestionAttempt` for attempt tracking
- Previous attempt restoration (like McqCard)

### 4.2 Create `src/components/content/TrueFalseList.tsx`
Container component:
- Fetches questions using `useChapterTrueFalseQuestions`
- Maps over questions to render `TrueFalseCard`
- Section filtering support via `SectionFilter`
- Admin edit/delete controls
- Empty state message

---

## Phase 5: Admin Components

### 5.1 Create `src/components/content/TrueFalseFormModal.tsx`
Form modal with fields:
- Statement textarea (required, min 10 chars)
- Correct answer toggle (True/False switch)
- Explanation textarea (optional)
- Difficulty dropdown (easy/medium/hard)
- Section selector (using `SectionSelector` component)

### 5.2 Create `src/components/content/TrueFalseAdminTable.tsx`
Admin table view with:
- Multi-select checkboxes for bulk operations
- Statement preview column (truncated)
- Answer column (True/False badge)
- Difficulty column
- Section column with inline dropdown assignment
- Edit/Delete action buttons
- Integration with `BulkSectionAssignment`
- CSV export functionality

### 5.3 Create `src/components/content/TrueFalseBulkUploadModal.tsx`
Bulk upload modal with:
- Drag-and-drop CSV/Excel file upload
- Template download button
- Preview parsed data in table
- Validation feedback with row-level errors
- Section pre-assignment dropdown
- Uses `useBulkCreateTrueFalseQuestions` hook

---

## Phase 6: Edge Functions

### 6.1 Create `supabase/functions/bulk-import-true-false/index.ts`
Following `bulk-import-mcqs` pattern:
- JWT validation
- Admin role check
- Input validation
- Section ID resolution from section_name/section_number
- Bulk insert using service role
- Error handling and response

### 6.2 Update `supabase/config.toml`
Add function configuration:
```toml
[functions.bulk-import-true-false]
verify_jwt = false
```

---

## Phase 7: Template System Integration

### 7.1 Update `src/components/admin/HelpTemplatesTab.tsx`

Add to `TEMPLATE_SCHEMAS`:
```typescript
true_false: {
  columns: ['statement', 'correct_answer', 'explanation', 'difficulty', 'section_name', 'section_number'],
  required: ['statement', 'correct_answer'],
  optional: ['explanation', 'difficulty', 'section_name', 'section_number'],
  examples: [
    [
      'The left ventricle pumps blood to the systemic circulation.',
      'TRUE',
      'The left ventricle is responsible for systemic circulation, while the right ventricle handles pulmonary circulation.',
      'easy',
      'Cardiac Anatomy',
      '1'
    ],
    [
      'Insulin is produced by the alpha cells of the pancreas.',
      'FALSE',
      'Insulin is produced by the beta cells. Alpha cells produce glucagon.',
      'medium',
      'Endocrinology',
      '2'
    ],
  ],
}
```

Add to `BUILTIN_TEMPLATES`:
```typescript
{
  id: 'true_false',
  title: 'True/False Questions Template',
  description: 'Single statement questions with True or False answers',
  format: 'csv',
  icon: 'spreadsheet',
}
```

---

## Phase 8: AI Generation Integration

### 8.1 Update `supabase/functions/generate-content-from-pdf/index.ts`

Add `true_false` to `ContentType`:
```typescript
type ContentType = ... | "true_false";
```

Add schema to `CONTENT_SCHEMAS`:
```typescript
true_false: {
  statement: "string - the statement to evaluate (at least 15 characters)",
  correct_answer: "boolean - true or false",
  explanation: "string - explanation of why the statement is true or false",
  difficulty: "string - easy, medium, or hard",
  section_number: "string (optional) - section number from the provided list",
}
```

Add validation function:
```typescript
function validateTrueFalseItem(item: any, index: number): ValidationResult {
  const errors: string[] = [];
  
  if (!item.statement || item.statement.length < 15) {
    errors.push(`T/F #${index + 1}: statement must be at least 15 characters`);
  }
  if (typeof item.correct_answer !== 'boolean') {
    // Try to convert string
    if (item.correct_answer === 'true' || item.correct_answer === 'TRUE') {
      item.correct_answer = true;
    } else if (item.correct_answer === 'false' || item.correct_answer === 'FALSE') {
      item.correct_answer = false;
    } else {
      errors.push(`T/F #${index + 1}: correct_answer must be boolean`);
    }
  }
  
  return { isValid: errors.length === 0, errors, warnings: [] };
}
```

### 8.2 Update `supabase/functions/approve-ai-content/index.ts`

Add `true_false` case to content type handling:
```typescript
case "true_false": {
  // Insert into true_false_questions table
  const insertData = items.map(item => ({
    module_id: moduleId,
    chapter_id: chapterId,
    section_id: resolveSectionId(item.section_number, sections),
    statement: item.statement,
    correct_answer: item.correct_answer,
    explanation: item.explanation || null,
    difficulty: item.difficulty || null,
    created_by: user.id,
  }));
  
  const { data, error } = await serviceClient
    .from('true_false_questions')
    .insert(insertData)
    .select('id');
  // ...
}
```

### 8.3 Update `supabase/functions/process-batch-job/index.ts`

Add to `CONTENT_TYPE_TABLES`:
```typescript
true_false: 'true_false_questions',
```

### 8.4 Update `supabase/functions/analyze-bulk-upload/index.ts`

Add to `TEMPLATE_SCHEMAS`:
```typescript
true_false: {
  required: ["statement", "correct_answer"],
  optional: ["explanation", "difficulty", "section_name", "section_number"],
  aliases: {
    "question": "statement",
    "answer": "correct_answer",
    "is_true": "correct_answer",
    "true_false": "correct_answer",
  },
  description: "True/False questions with single statement",
}
```

---

## Phase 9: AI Content Factory Integration

### 9.1 Update `src/components/admin/AIContentFactoryModal.tsx`

Add to `CONTENT_TYPES`:
```typescript
{ value: 'true_false', label: 'True/False Questions', icon: ToggleLeft, description: 'Single statement true/false questions', category: 'practice' },
```

### 9.2 Update `src/components/admin/AIBatchGeneratorModal.tsx`

Add to `CONTENT_TYPES`:
```typescript
{ value: 'true_false', label: 'True/False', description: 'True/False statements' },
```

---

## Phase 10: Chapter Page Integration

### 10.1 Update `src/pages/ChapterPage.tsx`

1. Import new hook and components:
```typescript
import { useChapterTrueFalseQuestions } from '@/hooks/useTrueFalseQuestions';
import { TrueFalseList } from '@/components/content/TrueFalseList';
```

2. Add data fetching:
```typescript
const { data: trueFalseQuestions, isLoading: tfLoading } = useChapterTrueFalseQuestions(chapterId);
const { data: deletedTf } = useChapterTrueFalseQuestions(chapterId, true);
```

3. Add counts to practice tabs:
```typescript
const practiceTabs = createPracticeTabs({
  mcqs: mcqs?.length || 0,
  true_false: trueFalseQuestions?.length || 0,
  essays: essays?.length || 0,
  // ...
});
```

4. Add tab content rendering:
```typescript
{practiceTab === 'true_false' && (
  <TrueFalseList
    questions={filterBySection(trueFalseQuestions || [])}
    chapterId={chapterId!}
    moduleId={moduleId!}
    isAdmin={canManageContent}
    showDeleted={showDeletedTf}
    deletedQuestions={deletedOnlyTf}
  />
)}
```

---

## Phase 11: Question Attempts Integration

### 11.1 Update `src/hooks/useQuestionAttempts.ts`

Extend `PracticeQuestionType`:
```typescript
export type PracticeQuestionType = 'mcq' | 'osce' | 'true_false';
```

Update `updateChapterAttempt` function to handle 'true_false' table name.

---

## Phase 12: Test Mode Integration

### 12.1 Create `src/components/exam/TrueFalseTimedExam.tsx`

Timed exam component for True/False questions:
- Random question selection
- Timer integration (configurable seconds per question)
- Score tracking (correct/total)
- Results display with breakdown
- Follows `MockTimedExam` pattern

### 12.2 Update `src/components/exam/ChapterMockExamSection.tsx`

Add True/False as a test option:
```typescript
type ContentType = 'mcq' | 'osce' | 'true_false';

const { data: tfQuestions, isLoading: tfLoading } = useChapterTrueFalseQuestions(chapterId);
const tfCount = tfQuestions?.length || 0;
const hasTf = tfCount > 0;

// Add tab trigger and content for true_false
```

---

## Phase 13: Admin Content Actions

### 13.1 Update `src/components/admin/AdminContentActions.tsx`

Add True/False option to the "Add Content" dropdown menu:
```typescript
{ id: 'true_false', label: 'True/False Question', icon: ToggleLeft }
```

Wire up to open `TrueFalseFormModal`.

---

## Phase 14: Progress Tracking

### 14.1 Update `src/hooks/useChapterProgress.ts`

Include True/False questions in progress calculation:
```typescript
// Fetch T/F count
const { data: tfQuestions } = useChapterTrueFalseQuestions(chapterId);
const tfCount = tfQuestions?.length || 0;

// Add to practice totals
practiceTotal += tfCount;
practiceCompleted += tfCompletedCount;
```

---

## Implementation Order

| Step | Files | Priority |
|------|-------|----------|
| 1 | Database migration (tables + RLS) | Critical |
| 2 | `src/lib/validators.ts` | Critical |
| 3 | `src/hooks/useTrueFalseQuestions.ts` | Critical |
| 4 | `src/config/tabConfig.ts` | Critical |
| 5 | `src/components/content/TrueFalseCard.tsx` | Critical |
| 6 | `src/components/content/TrueFalseList.tsx` | Critical |
| 7 | `src/components/content/TrueFalseFormModal.tsx` | Critical |
| 8 | `src/pages/ChapterPage.tsx` integration | Critical |
| 9 | `supabase/functions/bulk-import-true-false/index.ts` | High |
| 10 | `src/components/content/TrueFalseBulkUploadModal.tsx` | High |
| 11 | `src/components/admin/HelpTemplatesTab.tsx` | High |
| 12 | `supabase/functions/generate-content-from-pdf/index.ts` | High |
| 13 | `supabase/functions/approve-ai-content/index.ts` | High |
| 14 | `src/components/admin/AIContentFactoryModal.tsx` | High |
| 15 | `src/components/admin/AIBatchGeneratorModal.tsx` | High |
| 16 | `src/components/content/TrueFalseAdminTable.tsx` | Medium |
| 17 | `src/hooks/useQuestionAttempts.ts` | Medium |
| 18 | `src/components/exam/TrueFalseTimedExam.tsx` | Medium |
| 19 | `src/components/exam/ChapterMockExamSection.tsx` | Medium |
| 20 | Analytics hook and dashboard (future) | Low |

---

## CSV Template Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| statement | Yes | The statement text (min 10 chars) | "The mitral valve separates the left atrium from the left ventricle." |
| correct_answer | Yes | "true", "TRUE", "false", or "FALSE" | TRUE |
| explanation | No | Why the statement is true/false | "The mitral valve (bicuspid valve) is located between..." |
| difficulty | No | "easy", "medium", or "hard" | medium |
| section_name | No | Section name for filtering | "Cardiac Valves" |
| section_number | No | Section number (e.g., "3.1") | 2 |

---

## Testing Checklist

After implementation, verify:
- [ ] Create single T/F question via form modal
- [ ] Edit existing T/F question
- [ ] Soft delete and restore T/F question
- [ ] Bulk upload via CSV with section tagging
- [ ] Download template from Help Templates tab
- [ ] Student can answer T/F questions in Practice tab
- [ ] Previous attempts are restored correctly
- [ ] Section filtering works in chapter view
- [ ] AI Content Factory generates T/F questions
- [ ] Batch AI generation includes T/F type
- [ ] Test mode includes T/F option (when implemented)
- [ ] Progress tracking includes T/F completion
