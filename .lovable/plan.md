

## Fix: X Close Button on "Generate AI Case" Modal

The `Dialog` has `onOpenChange={() => {}}` (a no-op) to support the discard confirmation pattern. However, the Radix `DialogPrimitive.Close` button (the X) triggers `onOpenChange(false)`, which does nothing.

**Fix**: Add `onPointerDown` to the `DialogContent` to intercept clicks on the native close button and route them through `attemptClose()` instead. Specifically, add an `onCloseAutoFocus` is already handled, but the close button click needs to be caught.

Actually, the simplest fix: change `onOpenChange={() => {}}` to `onOpenChange={(v) => { if (!v) attemptClose(); }}`. This way:
- The X button click triggers `onOpenChange(false)` → calls `attemptClose()`
- `attemptClose()` already handles the discard confirmation logic
- Escape and outside click are already handled separately with `preventDefault()`

**File**: `src/components/clinical-cases/ClinicalCaseAIGenerateModal.tsx`, line 202

Change: `onOpenChange={() => {}}` → `onOpenChange={(v) => { if (!v) attemptClose(); }}`

Single line change. The escape key and outside click handlers already `preventDefault()` so they won't double-fire.

