

## Issues Found

### 1. Generated case never appears — edge function mismatch
The `generate-vp-case` edge function always generates **staged** cases (old VP format) and validates that a `stages` array exists (line 210). When the modal sends `stageCount: 0` for AI-driven cases, the AI prompt says "Number of Stages: 0" which either produces no stages (→ validation fails with 400) or confuses the model. The 400 error is caught by `supabase.functions.invoke` as `fnError`, so the modal shows an error instead of the preview.

**Fix**: Update the edge function to detect `aiDriven: true`, use a simplified prompt that only generates `title`, `intro_text`, `estimated_minutes`, `tags`, and `learning_objectives` (no stages), and skip stage validation for AI-driven cases.

### 2. No confirmation on close/discard/escape
Currently, closing the modal (X button, Escape, Discard, Cancel) immediately resets and closes without warning, even when a generated case exists. This risks accidentally losing AI-generated content.

**Fix**: Add an `AlertDialog` confirmation that intercepts close attempts when `generatedCase` is not null. This covers:
- Escape key (via `onInteractOutside` and `onEscapeKeyDown` on DialogContent)
- X close button
- Cancel / Discard buttons

---

## Changes

### File 1: `supabase/functions/generate-vp-case/index.ts`
- Read the `aiDriven` flag from the request body
- When `aiDriven === true`:
  - Use a simplified system prompt that outputs only `{ title, intro_text, estimated_minutes, tags, learning_objectives }` — no stages
  - Skip `validateCaseStructure` (which requires stages)
- Keep existing staged generation path unchanged for non-AI cases

### File 2: `src/components/clinical-cases/ClinicalCaseAIGenerateModal.tsx`
- Add `showDiscardConfirm` state
- Intercept all close paths: when `generatedCase` exists OR `isGenerating`, show an `AlertDialog` asking "Discard generated case? This content will be lost."
- Prevent Escape key from closing when generated case exists (use `onEscapeKeyDown` with `preventDefault`)
- Prevent clicking outside from closing (use `onInteractOutside` with `preventDefault`)
- Only after user confirms discard → reset and close

