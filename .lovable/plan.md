

# Fix: Filter & Search in Admin Assignment Dialogs

## Problem
Both the "Assign Topic Admin" and "Assign Module Admin" dialogs show ALL users (including students) in a flat dropdown, making it very hard to find the right person.

## Changes

### 1. TopicAdminsTab.tsx — Filter out students + add search

**Current** (line 248-250): `eligibleUsers` includes `student`, `teacher`, `topic_admin` roles — students shouldn't be here.

**Fix**:
- Change `eligibleUsers` to exclude `student` role — only show `teacher`, `topic_admin`, `department_admin`, `platform_admin`
- Add a `userSearch` state for text filtering
- Replace the `<Select>` for user with a searchable list: add an `<Input>` search box above the user `<SelectContent>`, filtering by name/email
- Sort users alphabetically

### 2. UsersTab.tsx — Same improvements for Module Admin dialog

**Current** (line 528): Filter includes `student` in the allowed roles list.

**Fix**:
- Remove `student` from the role filter (keep `teacher`, `topic_admin`, `department_admin`)
- Add search input inside the user selection area
- Sort alphabetically (already done)

### Implementation Detail

Since shadcn `<Select>` doesn't natively support search, we'll use a `Command` (combobox) pattern with `Popover` + `Command` + `CommandInput` + `CommandList` to provide searchable user selection. Both dialogs get the same treatment.

| File | Change |
|------|--------|
| `src/components/admin/TopicAdminsTab.tsx` | Remove `student` from eligibleUsers, replace Select with searchable Command/Popover |
| `src/components/admin/UsersTab.tsx` | Remove `student` from role filter, replace Select with searchable Command/Popover |

