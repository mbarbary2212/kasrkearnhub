
# Plan: Make 5th MCQ Choice (E) Optional

## Overview
Currently, the MCQ system requires exactly 5 choices (A-E). Some departments only have 4-choice questions (A-D). This plan modifies the system to support **4 or 5 choices**, making option E optional while maintaining backward compatibility with existing 5-choice questions.

## Changes Required

### 1. Validation Schema (src/lib/validators.ts)
Update the Zod schema to accept 4-5 choices instead of exactly 5:

- Change `choices` array validation from `.length(5)` to `.min(4).max(5)`
- Update the error message to: "MCQ must have 4 or 5 choices"
- Ensure `correct_key` validation still works (must match one of the provided choices)

### 2. MCQ Form Modal (src/components/content/McqFormModal.tsx)
Modify the form UI to make option E optional:

- Change option E input from `required` to optional
- Add visual indicator showing E is optional (e.g., "(Optional)" label)
- Filter out empty choice E before submission
- Update default choices to still show all 5 fields but only require 4

### 3. CSV Parser (src/hooks/useMcqs.ts - parseMcqCsv function)
Update bulk import CSV parsing to handle 4-choice MCQs:

- Filter out empty choice E when parsing CSV
- Only include choices with non-empty text
- Update correct_key validation to work with 4 choices

### 4. Edge Function (supabase/functions/bulk-import-mcqs/index.ts)
Update the bulk import edge function:

- Accept 4 or 5 choices in the request
- Update the TypeScript interface to reflect optional E
- Filter empty choices before database insertion

### 5. Display Components
These components already work correctly because they iterate over the `choices` array dynamically:
- **McqCard.tsx** - Maps over `choices` array (no changes needed)
- **MockExamQuestion.tsx** - Maps over `choices` array (no changes needed)

### 6. Type Definition (src/hooks/useMcqs.ts)
Consider if the `McqChoice` interface needs updating - currently the key is typed as `'A' | 'B' | 'C' | 'D' | 'E'` which will continue to work for both 4 and 5 choices.

---

## Technical Details

### Validator Changes
```typescript
// Current
.length(5, 'MCQ must have exactly 5 choices (A-E)')

// New
.min(4, 'MCQ must have at least 4 choices (A-D)')
.max(5, 'MCQ can have at most 5 choices (A-E)')
```

### Form Modal Changes
- Display all 5 choice inputs in the form
- Only the first 4 (A-D) are required; E is optional
- Before submission, filter choices to only include those with non-empty text
- Add "(Optional)" label next to choice E

### CSV Parser Changes
```typescript
// Filter out empty choices
choices: [
  { key: 'A' as const, text: choiceA || '' },
  { key: 'B' as const, text: choiceB || '' },
  { key: 'C' as const, text: choiceC || '' },
  { key: 'D' as const, text: choiceD || '' },
  { key: 'E' as const, text: choiceE || '' },
].filter(c => c.text.trim() !== '')
```

---

## Backward Compatibility
- Existing 5-choice questions remain valid and unchanged
- New 4-choice questions will work seamlessly
- Display components already handle variable-length choice arrays
- No database schema changes required (choices stored as JSONB)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/validators.ts` | Update choices array length validation from exactly 5 to 4-5 |
| `src/components/content/McqFormModal.tsx` | Make choice E optional in form, filter empty choices on submit |
| `src/hooks/useMcqs.ts` | Update CSV parser to filter empty choices |
| `supabase/functions/bulk-import-mcqs/index.ts` | Accept and handle 4-5 choices |

