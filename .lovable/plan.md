

## Fix Scrolling in All Clinical Case Modals and Consolidate Edit Options

### Problem 1: Scrolling Only Works on Scrollbar

Three modals still use Radix `ScrollArea`, which restricts mouse wheel/trackpad scrolling to only work when the cursor is directly over the scrollbar. The fix (already proven in `ClinicalCaseBuilderModal`) is to replace `ScrollArea` with a native `div` using `overflow-y-auto`.

**Files to fix:**

| File | Line | Current | Replace with |
|------|------|---------|-------------|
| `ClinicalCaseFormModal.tsx` | 194 | `<ScrollArea className="flex-1 min-h-0">` | `<div className="flex-1 min-h-0 overflow-y-auto">` |
| `ClinicalCaseFormModal.tsx` | 359 | `</ScrollArea>` | `</div>` |
| `ClinicalCaseStageFormModal.tsx` | 266 | `<ScrollArea className="flex-1 min-h-0">` | `<div className="flex-1 min-h-0 overflow-y-auto">` |
| `ClinicalCaseStageFormModal.tsx` | ~closing tag | `</ScrollArea>` | `</div>` |

Also remove the unused `ScrollArea` import from both files.

---

### Problem 2: Two Edit Buttons Per Case

Currently each case card in the admin list shows:
- **"Edit Stages"** button -- opens the Case Builder (which already contains an "Edit Details" button inside)
- **Edit icon** -- opens the Case Form directly

Since the Builder already lets admins edit case details via its "Edit Details" button, the separate Edit icon is redundant and confusing.

**Fix in `ClinicalCaseAdminList.tsx`:**
- Remove the standalone Edit icon button (lines 321-325)
- Rename the remaining button from "Edit Stages" / "Build Stages" to just **"Edit Case"** -- this single entry point opens the Builder, which handles both metadata editing and stage management

---

### Summary

| File | Change |
|------|--------|
| `ClinicalCaseFormModal.tsx` | Replace `ScrollArea` with native `div` for proper scrolling |
| `ClinicalCaseStageFormModal.tsx` | Replace `ScrollArea` with native `div` for proper scrolling |
| `ClinicalCaseAdminList.tsx` | Remove duplicate Edit icon button, rename remaining button to "Edit Case" |

