
# Fix Admin UI Showing in Impersonation/Preview Modes ✅ IMPLEMENTED

## Problem Summary

When a Super Admin uses impersonation (Mode A) or any admin uses "Preview Student UI" (Mode B), the chapter page still shows admin controls like:
- "Add Video", "Add Flashcard", "Bulk Upload" buttons
- "Cards / Table" view toggle
- "Manage" dropdown with Edit/Delete options
- Chapter Settings gear icon
- Admin-only tabs visibility

This happens because the components check role-based flags (`isAdmin`, `canManageContent`, `showAddControls`) without considering the impersonation/preview state from `useEffectiveUser`.

---

## Root Cause Analysis

| File | Issue |
|------|-------|
| `ChapterPage.tsx` | `showAddControls` and `canManageContent` don't check `isSupportMode` |
| `FlashcardsTab.tsx` | `showAdminView` checks `isAdmin || isTeacher` without `isSupportMode` |
| `LectureList.tsx` | `canManage` prop controls admin UI, passed from parent |
| `MindMapViewer.tsx` | `canManage` prop passed from parent |
| `ProgressPage.tsx` | Redirects admins away, blocking preview mode |

---

## Solution Architecture

Modify the relevant components to check `isSupportMode` from `useEffectiveUser()` and hide admin controls when active.

```text
+--------------------------------------------------+
|  When isSupportMode = true (Preview or Impersonate)  |
+--------------------------------------------------+
|  • showAddControls = false                        |
|  • canManageContent = false                       |
|  • showAdminView = false                          |
|  • Hide Chapter Settings                          |
|  • Don't redirect from ProgressPage               |
|  • Show student UI experience                     |
+--------------------------------------------------+
```

---

## Files to Modify

### 1. `src/pages/ChapterPage.tsx`

**Current code (lines 85-103):**
```typescript
const showAddControls = !!(
  auth.isTeacher ||
  auth.isAdmin ||
  // ...other checks
);

const canManageContent = !!(
  auth.isTeacher ||
  // ...other checks
);
```

**Updated code:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// Inside component:
const { isSupportMode } = useEffectiveUser();

// Override when in support mode (impersonation or preview)
const showAddControls = !isSupportMode && !!(
  auth.isTeacher ||
  auth.isAdmin ||
  // ...existing checks
);

const canManageContent = !isSupportMode && !!(
  auth.isTeacher ||
  // ...existing checks
);
```

### 2. `src/components/study/FlashcardsTab.tsx`

**Current code (line 69):**
```typescript
const showAdminView = (isAdmin || isTeacher) && canManage;
```

**Updated code:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// Inside component:
const { isSupportMode } = useEffectiveUser();

// Don't show admin view in support mode
const showAdminView = !isSupportMode && (isAdmin || isTeacher) && canManage;
```

### 3. `src/pages/ProgressPage.tsx`

**Current code:**
```typescript
if (isAdmin) {
  return <Navigate to="/admin" replace />;
}
```

**Updated code:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

// Inside component:
const { isSupportMode } = useEffectiveUser();

// Only redirect if admin AND not in support mode
if (isAdmin && !isSupportMode) {
  return <Navigate to="/admin" replace />;
}
```

### 4. Child components receive `canManage={false}` automatically

Since `ChapterPage` passes `canManageContent` to child components like:
- `LectureList` (receives `canEdit`, `canDelete`)
- `FlashcardsTab` (receives `canManage`)
- `MindMapViewer` (receives `canManage`)
- etc.

When `canManageContent` becomes `false` in support mode, all downstream components automatically hide their admin controls.

---

## Expected Behavior After Fix

| Mode | UI Shown | Admin Controls |
|------|----------|----------------|
| Normal Admin | Admin UI | Visible (Add, Edit, Delete, Table toggle) |
| Preview Student UI | Student UI | Hidden |
| Impersonating Student | Student UI with student's data | Hidden |

---

## Technical Notes

- `isSupportMode` is already computed in `useEffectiveUser` as `isImpersonating || isPreviewStudentUI`
- The banner display logic is already working correctly
- Write operations are already blocked via `isSupportMode` check in mutation hooks
- This fix only addresses the UI rendering aspect

---

## Testing Checklist

1. As Super Admin, click "Preview Student UI" - verify no admin controls
2. As Super Admin, impersonate a student - verify no admin controls
3. As Platform Admin, click "Preview Student UI" - verify no admin controls
4. Exit preview/impersonation - verify admin controls return
5. Navigate to Progress page in preview mode - verify it doesn't redirect
6. Check Flashcards tab shows student study mode, not admin grid
