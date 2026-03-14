

# Fix: "Failed to generate" in AI Content Factory — PDF Text Never Sent to AI

## Problem

The `generate-content-from-pdf` edge function **never sends actual PDF content to the AI**. On line 1175, it uses a hardcoded placeholder string:

```typescript
const pdfTextPlaceholder = `[PDF Content from: ${doc.title}]\n\nNote: In production, this would be extracted text from the PDF...`;
```

The AI receives no real content and either hallucinates generic items or fails to produce valid output — hence Basma's "Failed to generate" error. The "No items generated. Please retry." message comes from the client when zero items are returned.

Meanwhile, the `module_chapters` table already stores extracted chapter text in a `pdf_text` column (populated during chapter PDF upload), but the edge function never reads it.

## Root Cause Chain

1. Edge function fetches a signed URL for the PDF (line 1122) but never downloads it
2. Chapter query (line 1062) selects only `id, title, chapter_number` — does **not** select `pdf_text`
3. The `pdfTextPlaceholder` variable (line 1175) is a static string, not actual content
4. The AI generates content from module/chapter **names** alone, which is unreliable

## Fix

**File: `supabase/functions/generate-content-from-pdf/index.ts`**

Two changes:

### 1. Fetch `pdf_text` from `module_chapters` (line 1062)

Add `pdf_text` to the chapter select query:

```typescript
.select("id, title, chapter_number, pdf_text")
```

Update the `chapterInfo` type to include `pdf_text: string | null`.

### 2. Replace placeholder with real content (around line 1175)

Use the chapter's `pdf_text` when available. If not available, download the PDF from the signed URL and use the raw text. Fall back to the placeholder only as a last resort with a warning.

```typescript
// Priority 1: Use chapter pdf_text (already extracted during upload)
let pdfContent: string;
if (chapterInfo?.pdf_text && chapterInfo.pdf_text.length > 100) {
  pdfContent = chapterInfo.pdf_text;
  console.log(`[${jobId}] Using chapter pdf_text (${pdfContent.length} chars)`);
} else {
  // Priority 2: Download PDF and extract text
  try {
    const pdfResponse = await fetch(signedUrlData.signedUrl);
    if (pdfResponse.ok) {
      const pdfBuffer = await pdfResponse.arrayBuffer();
      // Extract text from PDF using basic text extraction
      const rawText = new TextDecoder().decode(new Uint8Array(pdfBuffer));
      // Simple stream-based text extraction for PDF
      const textMatches = rawText.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 10) {
        pdfContent = textMatches.map(m => m.slice(1, -1)).join(' ');
        console.log(`[${jobId}] Extracted ${pdfContent.length} chars from PDF binary`);
      } else {
        pdfContent = `[PDF from: ${doc.title}] — Text extraction unavailable. Generate content based on the module "${moduleCheck.name}"${chapterInfo ? ` chapter "${chapterInfo.title}"` : ''} using standard medical education knowledge.`;
        console.warn(`[${jobId}] PDF text extraction yielded minimal results`);
      }
    } else {
      throw new Error(`PDF download failed: ${pdfResponse.status}`);
    }
  } catch (err) {
    console.warn(`[${jobId}] PDF download/extract failed:`, err);
    pdfContent = `[PDF from: ${doc.title}] — Text extraction unavailable. Generate content based on the module "${moduleCheck.name}"${chapterInfo ? ` chapter "${chapterInfo.title}"` : ''} using standard medical education knowledge.`;
  }
}
```

Then replace `pdfTextPlaceholder` usage in the user prompt (line 1259) with `pdfContent`.

This ensures:
- When a chapter has `pdf_text` (the common case for Basma's workflow: PDF Library → chapter → Use as AI Source), the AI gets the actual textbook content
- The AI can generate accurate, chapter-specific MCQs instead of generic or empty results
- No permission issue — Basma's role is already checked and passes; the problem is purely that the AI has no content to work with

## Regarding Basma's Permission Question

Basma does **not** need any additional permissions. The edge function checks for `platform_admin`, `super_admin`, `department_admin`, or `admin` roles (line 936). If she can see the Admin Panel and PDF Library, her role is sufficient. The failure is purely the missing PDF content.

## Summary

| File | Change |
|------|--------|
| `generate-content-from-pdf/index.ts` | Add `pdf_text` to chapter select; replace placeholder with real chapter text; add PDF download fallback |

