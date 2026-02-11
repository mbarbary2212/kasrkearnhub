

# Department Management Permissions + Chapter Assignment Grouping

## Part 1: Allow Module Admins to Edit/Delete Departments

Currently, `canManageBooks` in `ModulePage.tsx` (line 48) only allows Platform Admins and Super Admins. Module admins should also be able to manage departments within their modules.

### File: `src/pages/ModulePage.tsx`
- Change line 48 from:
  ```
  const canManageBooks = isPlatformAdmin || isSuperAdmin;
  ```
  to:
  ```
  const canManageBooks = isPlatformAdmin || isSuperAdmin || isModuleAdmin;
  ```

This gives module admins the ability to add, edit, delete, and reorder departments within their assigned modules.

---

## Part 2: Group Chapters by Department in Topic Admin Assignment

When assigning a topic admin to chapters, the current dialog shows a flat list of all chapters. For modules with 2-3+ departments, this is confusing -- you cannot tell which chapter belongs to which department.

### File: `src/components/admin/TopicAdminsTab.tsx`
- In the chapter selection area (lines 466-495), group chapters by their `book_label` field
- Show department name as a sub-heading with its chapters nested underneath
- Each department section will have its own group of checkboxes

Before (flat list):
```
[ ] Ch. 1: Introduction
[ ] Ch. 2: Cell Biology  
[ ] Ch. 1: Upper Limb
[ ] Ch. 2: Lower Limb
```

After (grouped by department):
```
Histology
  [ ] Ch. 1: Introduction
  [ ] Ch. 2: Cell Biology

Anatomy
  [ ] Ch. 1: Upper Limb
  [ ] Ch. 2: Lower Limb
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/ModulePage.tsx` | Add `isModuleAdmin` to `canManageBooks` check (line 48) |
| `src/components/admin/TopicAdminsTab.tsx` | Group chapter checkboxes by `book_label` in assign dialog |

