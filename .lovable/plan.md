

# Plan: Simplify Mind Map Generation — Direct PDF-to-AI Pipeline

## Overview

Remove all app-side text extraction, quality scoring, and section detection. Send the PDF file directly to Gemini as binary input. For section maps, ask Gemini to identify sections from the PDF and return structured results.

## Key Concept

Gemini's `generateContent` API accepts PDF files via `inlineData` with `mimeType: application/pdf` and base64-encoded data. The PDF is sent as-is — no text extraction needed. The base64 encoding is purely a transport format required by JSON.

## Changes

### 1. Edge Function: `supabase/functions/generate-mind-map/index.ts`

**DELETE** (~480 lines):
- `detectSections()` and `normalizeText()` (lines 30-129)
- `extractTextFromPdfBuffer()` (lines 185-212)
- `extractTextWithPdfJs()` (lines 216-245)
- `scoreTextQuality()`, `QualityBreakdown`, `QualityResult` (lines 248-343)
- `runTieredExtraction()`, `buildResult()`, and all extraction types/interfaces (lines 345-505)
- All extraction branching logic in the main handler (lines 580-770)
- App-side section detection and text-based section loop (lines 772-774, 912-1028)

**KEEP**:
- Auth, role check, request parsing
- `validateMarkmapMarkdown()` (lines 131-181)
- `jsonResp()`, `jsonError()` helpers
- PDF download helper `downloadAdminDocPdf()`
- Prompt fetching from `mind_map_prompts` table
- AI settings, provider resolution
- Draft/publish save logic
- `ResultItem` interface

**NEW: `callGeminiWithPdf()` function**

Calls Gemini directly with the PDF as `inlineData`. Cannot use the shared `callAI()` because that only accepts text. This function:
- Takes `pdfBytes`, `systemPrompt`, `userPrompt`, model name, API key
- Base64-encodes the PDF bytes
- Sends to Gemini with `parts: [{ inlineData: { mimeType: 'application/pdf', data: base64 } }, { text: prompt }]`
- Uses same retry logic, safety settings, error handling as existing `callGeminiDirect`

**NEW: Simplified main flow**

```text
1. Auth + role check (unchanged)
2. Parse request: chapter_id/topic_id, generation_mode, document_id (no extraction_method)
3. Get PDF:
   - If document_id provided → fetch from admin_documents
   - Else → find latest chapter-linked admin_document
   - If none found → return clear error
4. Download PDF bytes via signed URL
5. Validate: size > 10KB, download successful
6. For "full" mode:
   - Call callGeminiWithPdf() with full chapter prompt
   - Validate output with validateMarkmapMarkdown()
   - Save to mind_maps table
7. For "sections" mode:
   - Call callGeminiWithPdf() with a special prompt asking Gemini to:
     a) Identify the main sections of the chapter
     b) Return a JSON array of { section_number, section_title, markdown }
   - Parse the structured response
   - Validate each section's markdown
   - Save each as a separate mind_map row
8. For "both" mode: run full first, then sections
9. Return simplified response
```

**Section generation prompt** will instruct Gemini to:
- Read the entire PDF
- Identify the true main sections (ignoring headers/footers/figures/references)
- Generate a separate Markmap mind map for each section
- Return results as a JSON array with `section_number`, `section_title`, `markdown_content`
- Use tool calling (function declaration) to get structured output reliably

**Simplified response** — remove extraction scores, text previews, heading counts. Keep:
```json
{
  "success": true,
  "generation_mode": "...",
  "source_document": { "name": "...", "id": "...", "pdf_size": 12345, "method": "direct_pdf_to_ai" },
  "results": [...],
  "total_generated": N,
  "total_failed": N,
  "total_skipped": N
}
```

**Metadata saved per map**:
```json
{
  "method": "direct_pdf_to_ai",
  "pdf_size": 12345,
  "source_document_id": "...",
  "prompt_snapshot": "...",
  "generated_at": "..."
}
```

### 2. Frontend Types: `src/hooks/useMindMaps.ts`

- Remove `ExtractionMethod` type
- Remove `extraction_method` from `GenerateMindMapRequest`
- Remove `ExtractionScoreEntry` interface
- Simplify `GenerateMindMapResponse.source_document` — remove `extraction_scores`, `extraction_method_used`, `chapter_pdf_text_length`, `selection_reason`, `selected_text_preview`, `fallback_triggered`, `heading_count`. Keep `name`, `id`, `pdf_size`, `method`.
- Remove `detection` block from response type (no app-side detection)

### 3. Admin Panel: `src/components/admin/MindMapAdminPanel.tsx`

- Remove `extractionMethod` state and its usage in `handleGenerate`
- Remove the "Extraction method override" dropdown (lines 300-314)
- Remove `ScoreBadge` and `ExtractionScoreRow` components
- Remove imports: `ExtractionMethod`, `ExtractionScoreEntry`, `Gauge`, `Clock`, `ArrowRight`
- Simplify result dialog: remove extraction scores, method badges, text preview, detection info
- Keep: source document name display, PDF size, result counts, individual results list
- Update tooltip text: "Sends the PDF directly to Gemini AI for analysis"

### 4. Shared AI Provider: `supabase/functions/_shared/ai-provider.ts`

No changes needed. The new `callGeminiWithPdf()` function lives in the edge function itself since it's specific to mind map generation and uses `inlineData` which the shared `callAI` doesn't support.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-mind-map/index.ts` | Rewrite: remove ~480 lines of extraction/detection, add ~80 lines for direct PDF-to-AI |
| `src/hooks/useMindMaps.ts` | Remove extraction types, simplify request/response interfaces |
| `src/components/admin/MindMapAdminPanel.tsx` | Remove extraction UI, simplify result dialog |

## Error Handling

- "No PDF document found for this chapter" — no admin_document linked
- "PDF could not be downloaded" — storage/signed URL failure
- "PDF is too small or invalid (< 10KB)" — corrupted/empty file
- "AI failed to process PDF" — Gemini error
- "Generated output was not valid mind map format" — validation failure
- Section generation failures do not block full map generation

## What Stays Unchanged

- Student rendering (MarkmapRenderer, AIMindMapCards)
- Document selector dropdown in admin panel
- Markmap validation logic
- Draft/publish workflow
- Mind map prompt settings (Content Factory tab)
- `mind_maps` table schema

