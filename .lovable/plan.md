

# Plan: Simplify PDF Section Detection & Coach Grounding

## Problem

The current flow is overcomplicated:
1. A `sync-pdf-text` function extracts text from PDFs and stores it in `pdf_text` columns
2. Then `extract-pdf-sections` reads that `pdf_text` to find sections
3. The coach also reads `pdf_text` for grounding

This is a two-step process that breaks when `pdf_text` is empty. The user's point: **just send the PDF directly to the AI**. No intermediate text extraction needed.

## Simplified Approach

```text
Current (broken):
  PDF in storage → sync-pdf-text → pdf_text column → extract-pdf-sections / coach-chat
  
Simplified:
  PDF in storage → extract-pdf-sections (sends PDF directly to AI)
  PDF in storage → coach-chat (sends PDF directly to AI)
```

## Changes

### 1. `extract-pdf-sections` — Send PDF directly to AI

Instead of reading `pdf_text` from the chapter, the function will:
- Look up the linked `admin_document` by `chapter_id`
- Download the PDF from `admin-pdfs` storage
- Send the PDF (base64) directly to the AI model (Gemini/Claude) with a prompt to extract section headings
- Return the sections — no text storage needed
- Keep regex as first-pass on `pdf_text` if it happens to exist, but the primary path is now: PDF → AI → sections

### 2. `coach-chat` — Fetch PDF for grounding on the backend

Instead of the client fetching `pdf_text` and passing it as context:
- Remove the client-side `pdf_text` fetch from `AskCoachPanel.tsx`
- Pass `chapterId` and `topicId` to the `coach-chat` edge function
- In `coach-chat`, look up the linked `admin_document`, download the PDF, and include it as a document attachment in the AI call (Gemini/Claude both support PDF input)
- This way the coach always has the real PDF content, not a potentially empty text column

### 3. Remove "Sync PDF" button from SectionsManager

- Remove the `useSyncPdfText` import and the "Sync PDF" button — no longer needed
- Keep the "Auto Detect" button which now directly downloads + AI-processes the PDF

### 4. Show PDF link confirmation

- In the SectionsManager header area, show a small indicator: "PDF linked ✓" or "No PDF linked" based on whether an `admin_document` exists for this chapter
- This gives admins the confirmation they asked for

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/extract-pdf-sections/index.ts` | Download PDF from storage → send to AI directly instead of reading `pdf_text` |
| `supabase/functions/coach-chat/index.ts` | Accept `chapterId`/`topicId`, fetch linked PDF from storage, attach to AI call |
| `src/components/coach/AskCoachPanel.tsx` | Remove client-side `pdf_text` fetch; pass `chapterId`/`topicId` to coach-chat instead |
| `src/components/sections/SectionsManager.tsx` | Remove "Sync PDF" button; add PDF-linked indicator |

### Not touched
- `sync-pdf-text` edge function stays deployed (harmless), but is no longer called from the UI
- `useSyncPdfText` hook stays in codebase but unused from SectionsManager

