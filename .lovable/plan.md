

# Combined Plan: Section Tagging at Import + AI-Only Auto-Tag + SBA Fix

## What This Fixes

1. **Section tagging at upload time** — MCQ/SBA/T/F imports will resolve `original_section_name`/`original_section_number` to `section_id` during import (like OSCE already does, but with a bug fix)
2. **AI-only Auto-Tag for untagged items** — The Auto-Tag button becomes purely AI-driven, reading full question content (not just titles), for items that still have no section
3. **SBA questionFormat passthrough** — SBAs will correctly save as `question_format: 'sba'` instead of silently becoming MCQs

---

## File Changes

### Edge Functions (3 files)

**`supabase/functions/bulk-import-mcqs/index.ts`** — Add section resolution before insert
- After validation (~line 226), before building `records`: if any MCQ has `original_section_name` or `original_section_number`, fetch sections for the `chapterId` (or `topicId`) from the `sections` table
- Match by `section_number` first, then by `name` (case-insensitive, with prefix stripping)
- Set `section_id` on matching records
- Pattern copied from OSCE import but using correct column `name` instead of `title`

**`supabase/functions/bulk-import-true-false/index.ts`** — Add same section resolution
- Same pattern as MCQ: resolve section before insert (~line 104)

**`supabase/functions/bulk-import-osce/index.ts`** — Fix column name bug
- Line 365: `.select('id, title, section_number')` → `.select('id, name, section_number')`
- Line 376: `s.title?.toLowerCase()` → `s.name?.toLowerCase()`

### Client Code (2 files)

**`src/hooks/useMcqs.ts`** — Accept and forward `questionFormat`
- Line 388: Add `questionFormat?: QuestionFormat` to mutation input type
- Line 409: Include `questionFormat` in `JSON.stringify` body

**`src/components/content/McqList.tsx`** — Pass `questionFormat` to mutation
- Line 619: Add `questionFormat` to the mutation call

### Auto-Tag System (2 files)

**`src/hooks/useAutoTagSections.ts`** — Strip keyword matching, make AI-only
- Remove `matchSection`, `matchSectionByTitle`, `STOP_WORDS`, `stripPrefix`, `tokenize` functions
- Add `CONTENT_COLUMNS` map for richer content per table (stem+choices+explanation for MCQs, statement+explanation for T/F, etc.)
- Single pass: fetch untagged items with rich content, send to AI edge function, apply assignments

**`supabase/functions/ai-auto-tag-sections/index.ts`** — Accept `content` instead of `title`
- Item format changes from `Title: "${item.title}"` to `Content: "${item.content}"`
- Update prompt text accordingly

