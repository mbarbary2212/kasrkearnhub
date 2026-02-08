
## What’s actually causing the “grey / in the background” dropdown

Your `AlertDialog` is configured with extremely high z-index values:

- `AlertDialogOverlay`: `z-[99998]`
- `AlertDialogContent`: `z-[99999]`

But the Radix `Select` menu (`SelectContent`) is currently rendering at a much lower z-index (in your case it was set to `z-[9999]`, and the default shadcn select is `z-50`).

Result: the Select menu is rendered *under the AlertDialog overlay/content*, so it looks grey (the overlay is “on top” of it) and feels like it’s in the background.

## Implementation approach (safe + permanent)

### 1) Fix the specific broken dropdown in AccountsTab (minimal change)
Update the role dropdown in:
- `src/components/admin/AccountsTab.tsx`

Change:
- `SelectContent className="z-[9999]"`

To:
- `SelectContent className="z-[100000]"`

Why `100000`: it guarantees the dropdown is above both the overlay (`99998`) and dialog content (`99999`) even if Radix portals to `document.body`.

### 2) Prevent this issue across the app (recommended)
Update the shared Select component so any Select used inside high-z dialogs works automatically:

File:
- `src/components/ui/select.tsx`

Change the default z-index in `SelectContent` from:
- `z-50`

To:
- `z-[100000]` (or `!z-[100000]` if we want to prevent accidental overrides)

This reduces the need to sprinkle `z-[...]` everywhere and avoids other “Select inside modal” cases breaking later.

### 3) Quick regression scan (to ensure we don’t break anything)
After the change:
- Open the same “Approve Access Request” dialog and open the role dropdown:
  - Menu should be above the modal, not greyed out
  - Clicking items should work normally
- Check at least 1–2 other Selects elsewhere (e.g., a content form modal) to confirm they still render correctly.

## Notes / edge cases
- If any screen intentionally relies on a Select being *below* something (rare), we can selectively lower z-index there, but the default should be “menus appear on top”.
- The background “grey” effect should disappear automatically once the dropdown is above the overlay (because the overlay is what’s tinting it).

## Files we will change
1. `src/components/admin/AccountsTab.tsx`
   - Raise role `SelectContent` z-index to `z-[100000]`

2. `src/components/ui/select.tsx`
   - Raise default `SelectContent` z-index from `z-50` to `z-[100000]`

## How we’ll verify the fix
- Reproduce: Admin → Accounts → Approve → open Assign Role dropdown
- Confirm:
  - dropdown is fully visible (not tinted/grey)
  - dropdown is clickable
  - selection updates the trigger value
