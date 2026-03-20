

# Plan: Improve Error Messaging, Logging, and Source Fallback in Mind Map Generation

## Changes

### 1. Edge Function (`supabase/functions/generate-mind-map/index.ts`)

**Error messaging** — Replace all "image-based" assumptions with accurate diagnosis:
- Line 359: Change `"The PDF may be image-based or empty."` → `"The built-in text extractor may have failed on compressed or encoded PDF streams. Try a different PDF or pre-extract the text."`
- Line 405: Same fix for auto-detected doc error message.

**Enhanced logging** — Add structured console.log entries for:
- Selected document title (already partially done, enhance with title)
- Extracted character count (already done, keep)
- Whether `chapter.pdf_text` was used vs direct extraction (already done, enhance label)
- Add a `source_method` field to the response: `"chapter_pdf_text"` | `"selected_document"` | `"auto_detected_document"`

**Fallback preference with both counts** — When `document_id` is not provided:
1. Check `chapter.pdf_text` first (existing behavior)
2. If available, ALSO check if an `admin_document` exists and report its potential availability
3. Return both `chapter_pdf_text_length` and `document_extraction_length` in the response when both sources exist, so the admin can compare

Update the response `source_document` object to include:
```
source_document: {
  name, id, text_length,
  source_method: "chapter_pdf_text" | "selected_document" | "auto_detected_document",
  chapter_pdf_text_length: number | null,  // always populated if chapter has pdf_text
}
```

### 2. Frontend Types (`src/hooks/useMindMaps.ts`)

Add `source_method` and `chapter_pdf_text_length` to `GenerateMindMapResponse.source_document`.

### 3. Admin Panel Result Dialog (`src/components/admin/MindMapAdminPanel.tsx`)

Update the source document info display to show:
- Which source method was used (label)
- Both character counts when available (e.g., "Chapter text: 45.2k chars | Document extraction: 12.1k chars")

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/generate-mind-map/index.ts` | Fix error messages, add source_method + chapter_pdf_text_length to response |
| `src/hooks/useMindMaps.ts` | Update source_document type |
| `src/components/admin/MindMapAdminPanel.tsx` | Show source method + dual counts in result dialog |

