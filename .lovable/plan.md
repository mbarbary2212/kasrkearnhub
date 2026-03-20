

# Plan: Link Mind Map Generation to Admin Documents PDF + Unify AI Content Factory

## Problem

1. **`generate-mind-map` fails** because it only reads `pdf_text` from `module_chapters`. If the chapter has no extracted `pdf_text` (common — the PDF is uploaded as an `admin_document`, not always extracted into `module_chapters.pdf_text`), generation hard-fails with "Chapter has no extracted PDF text."

2. **AI Content Factory** generates legacy JSON mind maps into `study_resources` (nodes/central_concept format), not into the new `mind_maps` table with Markmap markdown. These two systems are disconnected.

---

## Part A — Fix `generate-mind-map` Edge Function PDF Sourcing

**File**: `supabase/functions/generate-mind-map/index.ts`

After the existing `module_chapters.pdf_text` check, add a fallback:

1. If `chapter.pdf_text` is empty/null, query `admin_documents` for a document linked to that `chapter_id` (or `module_id`)
2. Download the PDF via a signed URL from `admin-pdfs` bucket
3. Extract text using the same raw binary extraction approach used in `generate-content-from-pdf`
4. If text extraction still yields nothing, return a clear error: "No PDF content found. Upload a Content PDF for this chapter first."

This mirrors the existing fallback logic in `generate-content-from-pdf` (lines 1175-1200).

---

## Part B — Update AI Content Factory Mind Map to Use `mind_maps` Table

### B1. Edge Function: `approve-ai-content/index.ts`

**Current** (lines 539-567): Inserts mind maps into `study_resources` with legacy JSON format (`central_concept`, `nodes`).

**Change**: When `contentType === "mind_map"`, instead of inserting into `study_resources`, insert into `mind_maps` table with:
- `chapter_id`, `topic_id` from the job
- `title` from the item
- `map_type: "full"`
- `source_type: "generated_markdown"`
- `markdown_content`: Convert the legacy JSON (central_concept + nodes) into Markmap markdown, OR update the prompt in `generate-content-from-pdf` to output markdown directly
- `status: "draft"`
- `created_by: user.id`

### B2. Edge Function: `generate-content-from-pdf/index.ts`

Update the mind_map schema definition (line 147-152) to request Markmap markdown output instead of JSON nodes. Change the expected format to:
```
mind_map: {
  title: "string - topic title",
  markdown_content: "string - full Markmap markdown with frontmatter"
}
```

Update `validateMindMapItem` to validate markdown format (reuse `validateMarkmapMarkdown` logic or a simplified version).

### B3. Frontend: `AIContentFactoryModal.tsx`

Add `mind_maps` query key to the invalidation list in `approveMutation.onSuccess`.

---

## Part C — Redeploy

Deploy both updated edge functions:
- `generate-mind-map`
- `approve-ai-content`
- `generate-content-from-pdf`

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-mind-map/index.ts` | Add `admin_documents` PDF fallback |
| `supabase/functions/approve-ai-content/index.ts` | Insert into `mind_maps` table instead of `study_resources` |
| `supabase/functions/generate-content-from-pdf/index.ts` | Update mind_map schema to request markdown output |
| `src/components/admin/AIContentFactoryModal.tsx` | Add `mind_maps` query invalidation |

No new files. No database migrations needed.

