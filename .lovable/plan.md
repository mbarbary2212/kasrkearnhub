

# Fix: MCQ Template + Section Assignment Pipeline

## Two Problems Found

### Problem 1: Old MCQ template in the chapter/topic UI
The MCQ template downloaded from the chapter UI (`McqList.tsx`) is:
```
stem,choiceA,choiceB,choiceC,choiceD,choiceE,correct_key,explanation,difficulty
```
Missing `section_name` and `section_number`. The Help & Templates version is correct and includes them.

### Problem 2: Section data silently dropped during MCQ import (the real bug)
The CSV parser **correctly reads** `section_name` and `section_number` from your file and stores them in `parsedRows`. However, the import pipeline **discards** this data:

1. `parseSmartMcqCsv()` returns both `mcqs` (no section info) and `parsedRows` (has section info)
2. `McqList.tsx` only uses the `mcqs` array, ignoring `parsedRows`
3. `McqFormData` type has no `original_section_name` / `original_section_number` fields
4. So nothing reaches the edge function, even though the edge function already supports these fields

This is why your Claude-generated MCQs with section tags show no assignment in the app.

## Fix Plan

### 1. Update MCQ template in McqList.tsx
Add `section_name,section_number` to the `CSV_TEMPLATE` string to match the Help & Templates version.

### 2. Add section fields to McqFormData type (useMcqs.ts)
Add `original_section_name?: string | null` and `original_section_number?: string | null` to the interface.

### 3. Carry section data through the import pipeline (McqList.tsx)
- In `parseSmartMcqCsv` result handling: merge `sectionName`/`sectionNumber` from `parsedRows` back into the `McqFormData` objects as `original_section_name`/`original_section_number`
- Ensure `handleBulkImport` passes these fields through to the mutation

### 4. No edge function changes needed
The `bulk-import-mcqs` edge function already maps `original_section_name` and `original_section_number` into the database insert (lines 222-223). It just never receives them because the client drops them.

## Files to Change
| File | Change |
|------|--------|
| `src/components/content/McqList.tsx` | Fix template; pass section data through import pipeline |
| `src/hooks/useMcqs.ts` | Add `original_section_name`, `original_section_number` to `McqFormData` |

After this fix, importing the `ch1_esophagus_mcq.csv` file will correctly preserve section metadata, and Auto-Tag will be able to match MCQs to the correct sections.

