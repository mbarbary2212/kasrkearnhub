

# Add Admin Management Actions to All Admin Sub-tabs

## Problem
The **Platform Admins** sub-tab (and similar role-specific tabs) only shows a flat list with names and badges — no way to change roles, edit, or remove users. All management actions currently require switching to the **Directory** tab and finding the user there.

## Solution
Add the same action controls (role dropdown + "..." menu) from the Directory tab to each admin-specific sub-tab (Platform Admins, Module Admins list items). This gives consistent inline management everywhere.

## Changes

### File: `src/components/admin/UsersTab.tsx`

**Platform Admins sub-tab (lines 651-665):**
- Replace the static badge-only row with the same layout used in Directory: Avatar + name/email on the left, role `<Select>` dropdown + `<DropdownMenu>` actions on the right
- Include: change role, upload photo, edit email, set password, reset password, suspend, deactivate, delete — same as Directory
- Add search input to filter platform admins by name/email
- Use Avatar component (with `avatar_url`) instead of plain initials div

**Module Admins sub-tab rows (if similarly flat):**
- Add the same "..." action menu to each module admin row for consistency

### Approach
Extract the per-user action row (role selector + dropdown menu) into a shared helper or inline it consistently across all sub-tabs. This avoids duplicating the action menu JSX — we'll create a small `renderUserActions(user, status)` helper function within `UsersTab` that returns the role select + dropdown menu, then call it from Directory, Platform Admins, and Module Admins tabs.

| File | Change |
|------|--------|
| `src/components/admin/UsersTab.tsx` | Extract user action controls into reusable helper; apply to Platform Admins tab; add search to Platform Admins tab |

