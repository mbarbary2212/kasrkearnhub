

## Combined Plan: Flashcard Extra Field + Cloze Template

### Plan A: Show "Extra" field in classic flashcard views

1. **`src/components/study/FlashcardsSlideshowMode.tsx`** — Add amber "Extra" section below the answer when flipped and `extra` exists
2. **`src/components/study/FlashcardsStudentView.tsx`** — Same treatment for student-facing view
3. **`src/components/study/FlashcardsAdminGrid.tsx`** — Show extra on the back face of the flip card in muted style

### Plan B: Help & Templates updates

4. **`src/components/admin/HelpTemplatesTab.tsx`**:
   - Add `extra` to classic flashcard schema `columns` and `optional` arrays
   - Add cloze flashcard template to `BUILTIN_TEMPLATES` array

All changes reuse the existing amber styling from `FlashcardClozeMode.tsx` for consistency.

