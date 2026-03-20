

# Session 6: Link Mind Map Generation to Admin Documents PDF + Unify AI Content Factory

## Summary

Fixed two disconnects: (A) `generate-mind-map` now falls back to `admin_documents` when `module_chapters.pdf_text` is empty, (B) the AI Content Factory now generates Markmap markdown and saves to the `mind_maps` table instead of legacy JSON to `study_resources`.

---

## Changes Made

### Part A — `generate-mind-map` PDF Fallback
- After checking `module_chapters.pdf_text`, falls back to querying `admin_documents` by `chapter_id`, then by `module_id`
- Downloads PDF via signed URL from `admin-pdfs` bucket
- Extracts text using binary BT/ET PDF text extraction
- Clear error message if no PDF found anywhere

### Part B — AI Content Factory Unified to `mind_maps` Table

1. **`generate-content-from-pdf/index.ts`**: Updated `mind_map` schema to request Markmap markdown with frontmatter instead of JSON nodes. Updated `validateMindMapItem` to validate markdown format.

2. **`approve-ai-content/index.ts`**: Mind map approval now inserts into `mind_maps` table with `markdown_content`, `source_type: "generated_markdown"`, `status: "draft"` instead of `study_resources`.

3. **`AIContentFactoryModal.tsx`**: Added `mind-maps` query key invalidation on approval.

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/generate-mind-map/index.ts` | Admin documents PDF fallback + text extraction |
| `supabase/functions/generate-content-from-pdf/index.ts` | Mind map schema → Markmap markdown |
| `supabase/functions/approve-ai-content/index.ts` | Insert into `mind_maps` table |
| `src/components/admin/AIContentFactoryModal.tsx` | Added `mind-maps` query invalidation |

### No new files. No database migrations needed.
