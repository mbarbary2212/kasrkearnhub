

## Fix Scrolling in Bulk Upload Short Questions Modal

### Problem
The "Bulk Upload Short Questions" dialog at line 805 of `AdminContentActions.tsx` has no scroll container. When content is tall (section warning + CSV format + file upload zone + error list + preview rows), it overflows the viewport and becomes inaccessible.

### Solution
Apply the project's standard modal scroll pattern:
1. Add `max-h-[90vh] overflow-hidden` to the `DialogContent`
2. Wrap the inner `<div className="space-y-4 pt-4">` with `max-h-[calc(90vh-8rem)] overflow-y-auto` so the header stays fixed while the body scrolls

### File to Modify

**`src/components/admin/AdminContentActions.tsx`**

- Line 805: Change `<DialogContent className="max-w-2xl">` to `<DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">`
- Line 813: Change `<div className="space-y-4 pt-4">` to `<div className="space-y-4 pt-4 max-h-[calc(90vh-8rem)] overflow-y-auto pr-1">`

This follows the same scroll hierarchy pattern used across other complex modals in the project (OSCE, Clinical Case Builder, etc.).

