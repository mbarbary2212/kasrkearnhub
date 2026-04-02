

# Fix Blueprint Excel Export & Align Question Types with Practice Content

## Problem 1 — Excel Missing Section Names

The export function at line 85 writes `"→ Section"` for every section row because it only has `section_id` from configs but never fetches section names. The UI component (`ChapterSectionRows`) fetches sections via `useChapterSections` hook, but the export function doesn't have access to those names.

**Fix:** Update `exportBlueprintToExcel` to accept a sections map or fetch sections before export. Since this is a download function (not a hook), we'll do a batch fetch of all sections for the relevant chapters before building the Excel.

**File: `src/components/admin/blueprint/blueprintExcelExport.ts`**
- Before building rows, collect all unique `chapter_id` values from configs that have `section_id`
- Batch-fetch sections from Supabase: `supabase.from('sections').select('id, name, section_number').in('chapter_id', chapterIds)`
- Build a `sectionNameMap: Map<string, { name: string, section_number: string | null }>`
- Replace `"→ Section"` with `"  → {section_number}. {name}"` or `"  → {name}"`

**File: `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx`**
- Pass supabase client or update the export call (the function already imports supabase, so no caller change needed — just make the export function async with internal fetch)

## Problem 2 — Question Types Should Match Practice Section Content

Current `QUESTION_TYPE_OPTIONS` includes items like "Flashcard", "Mind Map", "Pathway" which are not practice/exam question types. It's missing "Matching", "Image Questions", and "Case Scenarios" which exist in the Practice section.

**Fix:** Update `QUESTION_TYPE_OPTIONS` in `src/hooks/useChapterBlueprintConfig.ts` to align with actual Practice content types:

Replace with options that match the practice tabs + exam formats:
- SBA (Single Best Answer)
- True/False
- EMQ (Extended Matching)
- Cross-matching
- Matching (from Practice tab)
- Fill-in-blank (Cloze)
- Short Essay / Short Answer
- Long Essay
- Clinical Scenario (Case)
- Case Scenarios (short answer based on case — from Practice tab)
- OSCE Station
- Spot Diagnosis
- Paraclinical Interpretation
- Image Questions (from Practice tab)
- Practical (from Practice tab)

Remove non-exam types: Flashcard, Mind Map, Pathway (these are resources, not question formats).

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/admin/blueprint/blueprintExcelExport.ts` | Fetch section names from Supabase before building rows; display actual section names in Excel |
| `src/hooks/useChapterBlueprintConfig.ts` | Update `QUESTION_TYPE_OPTIONS` to align with Practice section content types; add Matching, Image Questions, Case Scenarios, Practical; remove Flashcard, Mind Map, Pathway |

No database changes. No new files.

## Technical Detail

The Excel export function already imports supabase indirectly via the config hook. We'll add a direct supabase import to the export file to fetch sections. The function is already async, so this is a clean addition. The section fetch uses a single `.in()` query covering all chapter IDs — no N+1 problem.

