

# Plan: Add Card Type Selector to Flashcard Bulk Upload

## Problem
When uploading flashcard CSVs, the modal shows one combined format hint for both normal and cloze cards, but there's no way for the admin to tell the system which type they're uploading. The parser tries to auto-detect via a `card_type` column, but this is fragile and confusing. The admin needs a clear toggle to select the target type.

## Solution
Add a "Flashcard" / "Cloze" toggle inside `StudyBulkUploadModal.tsx` that appears **only when `resourceType === 'flashcard'`**. This toggle:
1. Switches the CSV format hint to show the relevant format only
2. Tells the parser how to interpret the CSV (normal flashcard columns vs cloze columns)
3. Auto-sets `card_type` on all parsed items based on the selection

## Changes (single file: `StudyBulkUploadModal.tsx`)

### 1. Add state for card subtype
Add a `cardSubtype` state: `'normal' | 'cloze'`, defaulting to `'normal'`. Reset it in `resetState()`.

### 2. Add toggle UI
Below the dialog title, when `resourceType === 'flashcard'`, render two toggle buttons side by side:
- **Flashcard** (default) — standard front/back cards
- **Cloze** — cards with `{{c1::answer}}` syntax

Style: same pattern as the mode buttons in FlashcardsTab (variant default/outline toggle).

### 3. Split CSV format hints
Replace the single `flashcard` entry in `CSV_FORMATS` display with conditional rendering:
- When `cardSubtype === 'normal'`: show `title,front,back,section_name,section_number`
- When `cardSubtype === 'cloze'`: show `title,cloze_text,extra,section_name,section_number` (no need for front/back/card_type columns — the toggle already tells us)

### 4. Update parser behavior
Pass `cardSubtype` into `processCSV`. When `cardSubtype === 'cloze'`:
- Expect columns: `title`, `cloze_text`, `extra`, `section_name`, `section_number`
- Auto-set `card_type: 'cloze'` on every parsed item's content
- Validate that `cloze_text` contains at least one `{{c1::...}}` pattern

When `cardSubtype === 'normal'`:
- Use existing parsing (title, front, back)
- Set `card_type: 'normal'`

This also means the CSV for cloze is simpler — admins don't need to include a `card_type` column or leave `front`/`back` empty.

### 5. Update dialog title
Show "Import Flashcards" or "Import Cloze Flashcards" based on selection.

## File Modified

| File | Change |
|------|--------|
| `src/components/study/StudyBulkUploadModal.tsx` | Add card subtype toggle, split format hints, update parser routing |

