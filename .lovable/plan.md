

# Plan: Auto-Extract Sections from Chapter PDFs

## Summary

When an admin enables sections for a chapter, the system will automatically extract section headings from the chapter's stored `pdf_text`. If the PDF has clear numbered sections (e.g., "7.1 Classification of hemorrhage"), it parses them directly. If no clear structure is found, it calls the AI (using the admin-configured provider/model) to generate a section list. The admin retains full ability to edit, delete, add, and reorder sections afterward.

## How It Works

```text
Admin toggles "Enable Sections" ON
        │
        ▼
  Are there already sections for this chapter?
  ├─ YES → Do nothing (preserve existing sections)
  └─ NO  → Fetch pdf_text from module_chapters
           │
           ├─ pdf_text exists?
           │  ├─ YES → Try regex extraction first
           │  │        (pattern: numbered headings like "7.1 Title")
           │  │        ├─ Found 2+ sections → Insert them
           │  │        └─ Not enough → Call AI to extract sections
           │  └─ NO  → Show toast: "No PDF text available"
           │
           ▼
     Sections created, admin can edit/delete/add freely
```

## Changes

### 1. New Edge Function: `supabase/functions/extract-pdf-sections/index.ts`
- Accepts `chapter_id`
- Fetches `pdf_text` from `module_chapters`
- Attempts regex-based extraction of numbered section headings (e.g., "7.1", "7.2")
- If regex yields fewer than 2 sections, falls back to AI (using admin-configured provider/model from `ai_settings`)
- AI prompt: "Extract the main section/topic headings from this chapter text. Return a JSON array of {section_number, name}."
- Returns the extracted sections array

### 2. New Hook: `src/hooks/useExtractSections.ts`
- Calls the `extract-pdf-sections` edge function
- On success, bulk-inserts sections into the `sections` table
- Returns loading/progress state

### 3. Update: `src/components/sections/SectionsManager.tsx`
- When `handleToggleSections(true)` is called and no sections exist yet, automatically trigger section extraction
- Show a loading state ("Extracting sections from PDF...")
- After extraction, sections appear in the list, fully editable
- If extraction fails or returns nothing, show a toast and let admin add sections manually

### 4. Update: `src/hooks/useSections.ts`
- Modify `useToggleChapterSections` to return the chapter_id so the SectionsManager can trigger extraction after enabling

## Key Design Decisions

- **Regex first, AI second**: Saves AI calls when PDFs have clear numbered sections (like the surgical PDFs shown)
- **Only on first enable with no existing sections**: Won't overwrite manually created sections
- **Uses admin's configured AI provider**: Respects the Gemini/Claude/Lovable selection in AI Settings
- **Full edit capability preserved**: Extracted sections are regular section rows -- edit, delete, add, reorder all work as before

## Files Modified/Created

| File | Change |
|------|--------|
| `supabase/functions/extract-pdf-sections/index.ts` | New edge function for PDF section extraction |
| `src/hooks/useExtractSections.ts` | New hook to call extraction and insert sections |
| `src/components/sections/SectionsManager.tsx` | Auto-trigger extraction on enable, show loading state |

