
# Plan: Make MCQ Choice E Optional App-Wide

## Problem Summary
Currently, the MCQ validation schema requires all choice texts to have at least 1 character (`text.min(1)`). This blocks 4-choice MCQs from being created or imported anywhere in the app - both via the form modal and CSV bulk upload.

## Current Behavior
- `McqChoiceSchema` in `validators.ts` has `text.min(1, 'Choice text cannot be empty')`
- This applies to ALL choices including E
- When a 4-choice MCQ is parsed from CSV, choice E gets an empty string
- Validation fails with "Choice text cannot be empty"
- Both manual form submission and bulk upload are affected

## Good News: Display Components Already Work
The display components (`McqCard`, `MockExamQuestion`, `HardModeQuestion`, `MockExamResults`) simply iterate over whatever choices exist in the `choices` array:
```typescript
{choices.map((choice: McqChoice) => ( ... ))}
```
No changes needed for display - they'll correctly show 4 or 5 choices.

## Solution Overview

Update the validation layer to:
1. Require choices A-D (mandatory, non-empty)
2. Make choice E optional (can be omitted or have text)
3. Ensure if `correct_key = 'E'`, then choice E must exist
4. Filter empty choice E before validation in CSV parser

---

## Files to Modify

### 1. `src/lib/validators.ts` - Update Validation Schema

**Current schema (problematic):**
```typescript
export const McqChoiceSchema = z.object({
  key: z.enum(['A', 'B', 'C', 'D', 'E']),
  text: z.string()
    .min(1, 'Choice text cannot be empty')  // Blocks empty E
    .max(1000, 'Choice text is too long'),
});
```

**New schema approach:**
- Allow empty text at the individual choice level
- Add refinements to McqFormSchema to enforce A-D are non-empty
- Add refinement to check if correct_key=E then E must exist and be non-empty

```typescript
export const McqChoiceSchema = z.object({
  key: z.enum(['A', 'B', 'C', 'D', 'E']),
  text: z.string().max(1000, 'Choice text is too long'),  // Remove min(1)
});

export const McqFormSchema = z.object({
  stem: z.string().min(10).max(5000),
  choices: z.array(McqChoiceSchema)
    .min(4, 'MCQ must have at least 4 choices (A-D)')
    .max(5, 'MCQ can have at most 5 choices (A-E)')
    .refine(
      (choices) => {
        // A-D must all be present and non-empty
        const requiredKeys = ['A', 'B', 'C', 'D'] as const;
        return requiredKeys.every(key => 
          choices.some(c => c.key === key && c.text.trim().length > 0)
        );
      },
      { message: 'Choices A, B, C, and D are required and cannot be empty' }
    )
    .refine(
      (choices) => {
        const keys = choices.map(c => c.key);
        return new Set(keys).size === keys.length;
      },
      { message: 'Each choice must have a unique key' }
    ),
  correct_key: z.enum(['A', 'B', 'C', 'D', 'E']),
  explanation: z.string().max(2000).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
})
.refine(
  (data) => {
    // If correct_key is E, choice E must exist and be non-empty
    if (data.correct_key === 'E') {
      const choiceE = data.choices.find(c => c.key === 'E');
      return choiceE && choiceE.text.trim().length > 0;
    }
    return true;
  },
  {
    message: 'If correct answer is E, choice E must exist and have text',
    path: ['correct_key'],
  }
)
.refine(
  (data) => data.choices.some(c => c.key === data.correct_key),
  {
    message: 'Correct answer must match one of the choice keys',
    path: ['correct_key'],
  }
);
```

---

### 2. `src/lib/csvParser.ts` - Filter Empty E Before Validation

The CSV parser currently builds all 5 choices then validates. Update to filter out empty E BEFORE building the MCQ object:

**Lines ~471-519 in `parseSmartMcqCsv`:**

```typescript
// Current: builds all 5 choices
const choices: McqChoice[] = [
  { key: 'A', text: stripHtmlAndMarkdown(getValue('choice_a')) },
  { key: 'B', text: stripHtmlAndMarkdown(getValue('choice_b')) },
  { key: 'C', text: stripHtmlAndMarkdown(getValue('choice_c')) },
  { key: 'D', text: stripHtmlAndMarkdown(getValue('choice_d')) },
  { key: 'E', text: stripHtmlAndMarkdown(getValue('choice_e')) },
];

// Change to: filter empty E before building MCQ
const allChoices: McqChoice[] = [
  { key: 'A', text: stripHtmlAndMarkdown(getValue('choice_a')) },
  { key: 'B', text: stripHtmlAndMarkdown(getValue('choice_b')) },
  { key: 'C', text: stripHtmlAndMarkdown(getValue('choice_c')) },
  { key: 'D', text: stripHtmlAndMarkdown(getValue('choice_d')) },
  { key: 'E', text: stripHtmlAndMarkdown(getValue('choice_e')) },
];

// Filter: keep A-D always, keep E only if non-empty
const choices = allChoices.filter(c => 
  c.key !== 'E' || c.text.trim() !== ''
);
```

---

### 3. `src/components/content/McqFormModal.tsx` - Already Correct

The form modal already handles this correctly:
```typescript
// Filter out empty choice E before submission (line 89-92)
const filteredChoices = choices.filter(c => 
  REQUIRED_CHOICE_KEYS.includes(c.key as typeof REQUIRED_CHOICE_KEYS[number]) || c.text.trim() !== ''
);
```

No changes needed - it already filters empty E before validation.

---

### 4. `supabase/functions/bulk-import-mcqs/index.ts` - Already Correct

The edge function already has filtering:
```typescript
// Filter choices to remove empty E option (lines 13-16)
function filterValidChoices(choices: McqChoice[]): McqChoice[] {
  return choices.filter(c => c.key !== 'E' || (c.text && c.text.trim() !== ''));
}
```

No changes needed.

---

## Validation Rules After Changes

| Rule | Behavior |
|------|----------|
| Choices A-D | Required, must have non-empty text |
| Choice E | Optional - can be omitted entirely or included with text |
| Minimum choices | 4 (A, B, C, D) |
| Maximum choices | 5 (A, B, C, D, E) |
| If correct_key = E | Choice E must exist and be non-empty |
| Correct key | Must match one of the provided choice keys |

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `src/lib/validators.ts` | Remove `min(1)` from McqChoiceSchema.text, add refinements for A-D required | Core fix |
| `src/lib/csvParser.ts` | Filter empty E before building MCQ object | Bulk upload works |
| `McqFormModal.tsx` | No changes needed | Already handles optional E |
| Edge function | No changes needed | Already filters empty E |
| Display components | No changes needed | Already iterate over existing choices |

---

## Testing Checklist

After implementation:
- [ ] 4-choice MCQ can be created via form modal
- [ ] 4-choice MCQ CSV imports successfully  
- [ ] 5-choice MCQ still works in form and CSV
- [ ] MCQ with correct_key=E but empty choiceE is rejected with clear error
- [ ] Existing MCQs display correctly (both 4 and 5 choice)
- [ ] Mock exam shows correct number of choices
- [ ] Hard mode shows correct number of choices
