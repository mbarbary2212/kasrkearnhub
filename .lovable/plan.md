

## Fix Scrolling Issue and Add Missing Templates

### Problem 1: Scrolling Not Working Across Tabs

The scrolling stops working after opening and closing modal dialogs (like the Case Builder, Edit Case, Stage Form). This is caused by Radix UI Dialog's scroll lock mechanism: when a dialog opens, it sets `data-scroll-locked` on the `<body>` element and disables pointer events. With nested dialogs (e.g., Case Builder opens Edit Details or Add Stage sub-modals), closing the inner dialog can leave the scroll lock stuck on the body.

**Fix**: Add `modal={false}` or use `onCloseAutoFocus` to prevent scroll lock conflicts in nested dialogs. The most reliable fix is to ensure all nested dialogs inside ClinicalCaseBuilderModal use `onOpenChange` handlers that don't interfere with the parent dialog's scroll lock. Additionally, add a safety cleanup in the main layout or ScrollToTop component that removes stale `data-scroll-locked` attributes on route changes.

**Files to modify:**
- `src/components/ScrollToTop.tsx` -- Add cleanup of `data-scroll-locked` attribute on pathname change as a safety net
- `src/components/clinical-cases/ClinicalCaseBuilderModal.tsx` -- Ensure child dialogs (ClinicalCaseFormModal, ClinicalCaseStageFormModal, ClinicalCaseQuickBuildModal) don't interfere with parent dialog scroll lock by rendering them outside the parent Dialog
- `src/components/clinical-cases/ClinicalCaseFormModal.tsx` -- Check and fix any scroll lock issues
- `src/components/ui/dialog.tsx` -- Add a cleanup effect to DialogContent that removes scroll lock when unmounted unexpectedly

---

### Problem 2: Add Short Answer and True/False Templates

The Help and Templates section is missing bulk upload templates for **Short Answer Questions** (essays) and **True/False Questions**. Clinical Cases template already exists.

**File to modify:** `src/components/admin/HelpTemplatesTab.tsx`

**Add to TEMPLATE_SCHEMAS:**
- `essay` (Short Answer) schema with columns: `title`, `scenario_text`, `questions`, `model_answer`, `keywords`, `rating`, `section_name`, `section_number`
- `true_false` schema with columns: `statement`, `correct_answer`, `explanation`, `difficulty`, `section_name`, `section_number`

**Add to BUILTIN_TEMPLATES:**
- Short Answer Questions Template (.csv) -- for bulk uploading essay-type questions with scenario, questions, model answer, and keywords
- True/False Questions Template (.csv) -- for bulk uploading true/false statements with explanations

---

### Summary of Changes

| File | Change |
|------|--------|
| `ScrollToTop.tsx` | Remove stale `data-scroll-locked` on route change |
| `dialog.tsx` | Add unmount cleanup for scroll lock |
| `ClinicalCaseBuilderModal.tsx` | Move child dialogs outside parent Dialog to prevent nested lock conflicts |
| `HelpTemplatesTab.tsx` | Add `essay` and `true_false` template schemas and built-in template entries |

