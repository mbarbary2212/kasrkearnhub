

# Blueprint-Aware AI Content Generation — Final Implementation Plan

## Steps

### Step 1 — Database Migration
Add `question_types text[] DEFAULT '{}'` column to `chapter_blueprint_config`.

### Step 2 — Update `useChapterBlueprintConfig.ts`
- Add `question_types: string[]` to `ChapterBlueprintConfig` type
- Include in upsert payload (default `[]`)
- Add `QUESTION_TYPE_OPTIONS` constant with 14 formats: SBA, True/False, EMQ, Cross-matching, Cloze, Short Essay, Long Essay, Clinical Scenario, OSCE Station, Spot Diagnosis, Paraclinical Interpretation, Flashcard, Mind Map, Pathway

### Step 3 — Update `BlueprintCellPopover.tsx`
Add compact scrollable multi-select checklist of 14 question types below existing H/A/L buttons. Saved in same upsert call. Cell shows "3 types" badge when types are set. No changes to H/A/L logic or cell colors.

### Step 4 — Create `supabase/functions/_shared/blueprint.ts`
Shared utility: accepts Supabase client + `chapter_id`, queries `chapter_blueprint_config` joined with `sections`, returns `{ configs, distribution_instruction }`. Weighting: high=3, average=2, low=1, untagged=1 → percentage per section. Returns empty string if no configs exist.

### Step 5 — Inject into `generate-content-from-pdf/index.ts`
After section fetching, before `baseSystemPrompt` construction: import `getBlueprintContext`, query, prepend `distribution_instruction`. No other changes.

### Step 6 — Inject into `generate-mind-map/index.ts`
Has `chapter_id` available. Import, query, prepend to `fullSystemPrompt`. No other changes.

### Step 7 — Inject into `generate-pathway/index.ts` (with guard)
- Accept optional `chapterId` in request body
- **Guard**: only call `getBlueprintContext` when `chapterId` is a non-empty string. If missing/empty/undefined, skip blueprint query entirely and proceed without injecting distribution instruction
- Frontend (`PathwayAIGenerateModal.tsx`): pass `chapterId` in invoke body

### Step 8 — Inject into `generate-vp-case/index.ts`
Accept optional `chapter_id`, same null guard as pathway — only query blueprint if non-empty string provided. Future-ready.

### Step 9 — Inject into `generate-structured-case/index.ts`
Already has `chapter_id` from `vpCase.chapter_id`. Same guard pattern — only inject if chapter_id is truthy. Import, query, prepend to system prompt.

### Step 10 — Update `blueprintExcelExport.ts`
Append question types in parentheses when set: `High (SBA, True/False)`.

### Step 11 — Update Supabase types
Add `question_types: string[] | null` to `chapter_blueprint_config` row type in `src/integrations/supabase/types.ts`.

## Guard Pattern (applied to Steps 7-9)
```typescript
let blueprintInstruction = '';
if (chapterId && typeof chapterId === 'string' && chapterId.trim().length > 0) {
  const blueprint = await getBlueprintContext(serviceClient, chapterId);
  blueprintInstruction = blueprint.distribution_instruction;
}
```

## Files Changed

| File | Change |
|------|--------|
| Migration (new) | Add `question_types` column |
| `supabase/functions/_shared/blueprint.ts` (new) | Shared blueprint query + prompt builder |
| `supabase/functions/generate-content-from-pdf/index.ts` | Import + inject blueprint prompt |
| `supabase/functions/generate-mind-map/index.ts` | Import + inject blueprint prompt |
| `supabase/functions/generate-pathway/index.ts` | Accept `chapterId` with null guard, import + inject |
| `supabase/functions/generate-vp-case/index.ts` | Accept optional `chapter_id` with null guard, import + inject |
| `supabase/functions/generate-structured-case/index.ts` | Import + inject with null guard |
| `src/components/algorithms/PathwayAIGenerateModal.tsx` | Add `chapterId` to invoke body |
| `src/hooks/useChapterBlueprintConfig.ts` | Add `question_types` to type + upsert + constants |
| `src/components/admin/blueprint/BlueprintCellPopover.tsx` | Add question type checkboxes |
| `src/components/admin/blueprint/blueprintExcelExport.ts` | Append types to cell text |
| `src/integrations/supabase/types.ts` | Add `question_types` field |

## Not Modified
- Student-facing components
- H/A/L weighting display in `useChapterExamWeights`
- Auth or RLS policies
- Section fetching logic in generators
- Content type routing or response parsing

