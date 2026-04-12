

## Plan: Display Cloze Flashcards Correctly in Admin Grid

### Problem
The admin grid always reads `content.front` and `content.back` for display. Cloze cards store their text in `content.cloze_text` and leave `front`/`back` empty, so they appear blank.

### Fix

**File: `src/components/study/FlashcardsAdminGrid.tsx`**

Two changes:

1. **Grouping logic (line 36)** — When building the `front`/`back` strings for each card, check `card_type`:
   - If `cloze`: use `cloze_text` for front, `extra` for back
   - Otherwise: use `front`/`back` as before

2. **Front-side label (line 187)** — Show "Cloze" instead of "Question" when the card is a cloze type, so admins can visually distinguish card types at a glance.

No other files need changes.

