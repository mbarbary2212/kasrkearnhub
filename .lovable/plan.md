
# Fix Hard Delete and Add Sorting to All User Tabs + Activity Log for Departments

## 1. Remove Hard Delete, Replace with "Deactivated Users" Tab

You're right -- permanently deleting a user who has created content (departments, MCQs, essays, etc.) is dangerous and causes database errors due to foreign key constraints. Instead of trying to work around those constraints, we'll:

- **Remove the hard delete option entirely** from the `DeleteUserDialog` -- it will only do soft delete (deactivate)
- **Add a new "Deactivated" sub-tab** under Users that shows all deactivated/removed users in one place, with an option to restore them
- The delete button in the Directory menu will simply deactivate the user (soft delete), and they'll move to the Deactivated tab

### Changes:
- **`src/components/admin/DeleteUserDialog.tsx`**: Simplify to a single-step deactivation confirmation (no hard delete step). Remove the "permanently delete" flow entirely.
- **`src/pages/AdminPage.tsx`**: Add a "Deactivated" sub-tab that filters users with `status === 'removed'`. Each deactivated user card will have a "Restore" button.
- **`supabase/functions/provision-user/index.ts`**: Keep the soft delete handler, remove the hard delete code path to prevent accidental use.

## 2. Add Alphabetical Sorting to All User Sub-tabs

Currently only the Directory tab has A-Z/Z-A sorting. We'll add the same sort toggle to:

- **Students tab** (in `AdminPage.tsx`): Add `studentSortOrder` state and sort toggle button
- **Module Admins tab** (in `AdminPage.tsx`): Add `moduleAdminSortOrder` state and sort toggle button  
- **Platform Admins tab** (in `AdminPage.tsx`): Add `platformAdminSortOrder` state and sort toggle button
- **Topic Admins tab** (`TopicAdminsTab.tsx`): Add sort toggle to the topic admins list

Each tab will get the same A-Z/Z-A toggle button pattern used in the Directory tab.

## 3. Add Department Actions to Activity Log

Department creation/editing/deletion is not being logged because:
- The `useDepartments.ts` hook doesn't call `logActivity()`
- The `log-activity` edge function's allowlist doesn't include department-related actions

### Changes:
- **`supabase/functions/log-activity/index.ts`**: Add `'department'` to `ALLOWED_ENTITY_TYPES` and add `'created_department'`, `'updated_department'`, `'deleted_department'` to `ALLOWED_ACTIONS` with corresponding labels
- **`src/hooks/useDepartments.ts`**: Add `logActivity()` calls in the `onSuccess` callbacks of `useCreateDepartment`, `useUpdateDepartment`, and `useDeleteDepartment`

## Technical Summary

### Files to modify:
1. **`src/components/admin/DeleteUserDialog.tsx`** -- Remove hard delete, simplify to deactivation-only
2. **`src/pages/AdminPage.tsx`** -- Add Deactivated tab, add sort toggles to Students/Module Admins/Platform Admins
3. **`src/components/admin/TopicAdminsTab.tsx`** -- Add sort toggle
4. **`supabase/functions/provision-user/index.ts`** -- Remove hard delete code path
5. **`supabase/functions/log-activity/index.ts`** -- Add department to allowlists
6. **`src/hooks/useDepartments.ts`** -- Add activity logging calls

### Deactivated Users Tab Layout
```text
[Search bar]  [A-Z / Z-A sort]

[Avatar] Deactivated User Name     [Deactivated badge]  [Restore button]
         email@example.com
         Reason: "Deactivated by admin"
```
