

## Plan: Remove Admin Panel from Avatar Dropdown

Remove the "Admin Panel" menu item (and its separator) from the avatar dropdown, since there is now a prominent Admin Panel button in the header.

### Change

**`src/components/layout/MainLayout.tsx`** — Delete lines 213–219 (the `DropdownMenuSeparator` and `DropdownMenuItem` for Admin Panel inside the avatar dropdown).

