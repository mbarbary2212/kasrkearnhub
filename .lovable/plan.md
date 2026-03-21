

# Plan: Bridge PDF Text to Chapters & Topics

## Root Cause

The `module_chapters.pdf_text` column is **empty for all 488 chapters**. PDFs exist in the `admin_documents` table (47 chapter PDFs, all linked via `chapter_id`), but their text is never extracted and stored in `module_chapters.pdf_text`. Every feature that reads `pdf_text` -- Auto Detect Sections, Ask Coach, AI content generation -- gets null and silently fails.

Topics have no `pdf_text` column at all, so Ask Coach has zero grounding on topic pages.

```text
Current broken flow:
  admin_documents (47 PDFs with chapter_id)
       ↓ (no bridge)
  module_chapters.pdf_text = NULL for ALL chapters
       ↓
  extract-pdf-sections → "No PDF text available"
  Ask Coach → no grounding
  AI content gen → falls back to guessing
```

## Changes

### 1. Database Migration
- Add `pdf_text TEXT` column to `topics` table
- (module_chapters already has it, just never populated)

### 2. New Edge Function: `sync-pdf-text`
- Accepts `chapter_id` or `topic_id`
- Looks up the linked `admin_document` (by chapter_id or topic_id)
- Downloads the PDF from `admin-pdfs` storage via signed URL
- Sends first ~50 pages to Gemini/Claude with prompt: "Extract all text from this PDF preserving structure"
- Saves extracted text to `module_chapters.pdf_text` or `topics.pdf_text`
- Returns success with character count

### 3. New Hook: `src/hooks/useSyncPdfText.ts`
- Calls `sync-pdf-text` edge function
- Returns `{ syncPdfText, isSyncing }` state

### 4. UI: "Sync PDF" Button in SectionsManager
- Add a "Sync PDF" button (visible when chapter has a linked admin_document but no pdf_text)
- Shows status: "Extracting text from PDF..."
- After sync completes, Auto Detect becomes usable

### 5. Auto-trigger on PDF Upload
- In `useUploadAdminDocument`, after successful upload with a `chapter_id`, automatically call `sync-pdf-text` to populate `pdf_text`

### 6. Ask Coach: Topic PDF Grounding
- Update `AskCoachPanel.tsx` to also fetch `topics.pdf_text` when `studyContext.topicId` is set (currently only fetches from `module_chapters` when `chapterId` is set)

### 7. Bulk Sync (Admin Utility)
- Add a "Sync All PDFs" button in the PDF Library tab that iterates through all admin_documents with chapter_id and syncs their text
- This one-time operation populates pdf_text for all existing chapters

## Files Modified/Created

| File | Change |
|------|--------|
| Migration | Add `pdf_text TEXT` to `topics` |
| `supabase/functions/sync-pdf-text/index.ts` | New edge function: download PDF, AI-extract text, save to chapter/topic |
| `src/hooks/useSyncPdfText.ts` | New hook to call sync-pdf-text |
| `src/components/sections/SectionsManager.tsx` | Add "Sync PDF" button |
| `src/hooks/useAdminDocuments.ts` | Auto-trigger sync after upload with chapter_id |
| `src/components/coach/AskCoachPanel.tsx` | Also fetch topic pdf_text for grounding |
| `src/components/admin/PDFLibraryTab.tsx` | Add "Sync All PDFs" bulk action |

