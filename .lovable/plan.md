
# Fix: Show Student UI Elements in Preview Mode ✅ IMPLEMENTED

## Problem Identified

The "Preview Student UI" mode currently only hides admin controls - it doesn't show the student experience. This is because student-only UI elements (Coach FAB, Ask Coach button, Study Coach navigation, etc.) check `isAdmin` from `useAuthContext()`, which remains `true` even in preview mode.

## Solution Implemented

Added `isEffectivelyStudent` flag to `useEffectiveUser` hook and updated all components to use it.

```tsx
const { isAdmin } = useAuthContext();

// Student-only features hidden from admins
if (isAdmin) return null;  // ❌ Still true in preview mode!

// Or conditional rendering
{!isAdmin && <StudentFeature />}  // ❌ Never shows for admins
```

---

## Solution: Introduce `isEffectivelyStudent`

Add a derived value in `useEffectiveUser` that components can use to determine if they should render as student UI:

```typescript
// In useEffectiveUser.ts
const isEffectivelyStudent = isPreviewStudentUI || isImpersonating;
```

Then update all components that conditionally render student-only features to check this flag.

---

## Files to Modify

### 1. `src/hooks/useEffectiveUser.ts`

Add new export:
```typescript
// Indicates UI should render as student (preview or impersonation)
isEffectivelyStudent: boolean;

// Inside hook:
const isEffectivelyStudent = isPreviewStudentUI || isImpersonating;
```

### 2. `src/components/coach/CoachFAB.tsx`

**Current (line 21):**
```tsx
if (isMobile || !user || isAdmin) return null;
```

**Fixed:**
```tsx
const { isEffectivelyStudent } = useEffectiveUser();

// Show for students OR admins in preview/impersonation mode
if (isMobile || !user || (isAdmin && !isEffectivelyStudent)) return null;
```

### 3. `src/pages/ChapterPage.tsx`

**Current (line 342):**
```tsx
{!auth.isAdmin && (activeSection === 'resources' || activeSection === 'practice') && (
  <AskCoachButton ... />
)}
```

**Fixed:**
```tsx
const { isEffectivelyStudent } = useEffectiveUser();

// Show Ask Coach for students OR admins in preview mode
{(!auth.isAdmin || isEffectivelyStudent) && (activeSection === 'resources' || activeSection === 'practice') && (
  <AskCoachButton ... />
)}
```

### 4. `src/components/layout/MainLayout.tsx`

**Current (line 163):**
```tsx
{user && isMobile && !isAdmin && (
  // Study Coach mobile icon
)}
```

**Fixed:**
```tsx
const { isEffectivelyStudent } = useEffectiveUser();

{user && isMobile && (!isAdmin || isEffectivelyStudent) && (
  // Study Coach mobile icon
)}
```

**Current (line 223):**
```tsx
{!isAdmin && (
  <DropdownMenuItem onClick={() => navigate('/progress')}>
    <GraduationCap className="mr-2 h-4 w-4" />
    Study Coach
  </DropdownMenuItem>
)}
```

**Fixed:**
```tsx
{(!isAdmin || isEffectivelyStudent) && (
  <DropdownMenuItem onClick={() => navigate('/progress')}>
    <GraduationCap className="mr-2 h-4 w-4" />
    Study Coach
  </DropdownMenuItem>
)}
```

### 5. Content Lists (McqList, OsceList, etc.)

These components show different UIs for students vs admins (practice filters, status indicators, etc.). They need similar updates:

**Pattern to apply:**
```tsx
const { isEffectivelyStudent } = useEffectiveUser();

// Replace: if (!isAdmin)
// With:    if (!isAdmin || isEffectivelyStudent)

// Replace: {!isAdmin && <StudentFeature />}
// With:    {(!isAdmin || isEffectivelyStudent) && <StudentFeature />}
```

**Files to update:**
- `src/components/content/McqList.tsx` - Practice filters, status badges
- `src/components/content/OsceList.tsx` - Status filters
- `src/components/content/McqCard.tsx` - Status indicators
- `src/components/dashboard/LearningHubTabs.tsx` - Tab visibility

---

## Expected Behavior After Fix

| Mode | Admin Controls | Student UI (Coach, Filters) | Data Source |
|------|----------------|----------------------------|-------------|
| Normal Admin | ✅ Visible | ❌ Hidden | Real admin data |
| Preview Mode | ❌ Hidden | ✅ Visible | Demo data |
| Impersonation | ❌ Hidden | ✅ Visible | Real student data |
| Normal Student | ❌ Hidden | ✅ Visible | Real student data |

---

## Technical Notes

- `isEffectivelyStudent` is `true` when in preview mode OR impersonation
- This works with existing `isSupportMode` which blocks writes
- The hook already exists and is widely imported - minimal new imports needed
- Demo data hooks are already implemented from previous work

---

## Summary of Changes

1. **useEffectiveUser.ts**: Export `isEffectivelyStudent` flag
2. **CoachFAB.tsx**: Show FAB when admin is in preview/impersonation
3. **ChapterPage.tsx**: Show Ask Coach button in preview/impersonation
4. **MainLayout.tsx**: Show Study Coach icon and menu item in preview/impersonation
5. **McqList.tsx**: Show student filters in preview/impersonation
6. **OsceList.tsx**: Show student filters in preview/impersonation
7. **McqCard.tsx**: Show status indicators in preview/impersonation
8. **LearningHubTabs.tsx**: Show all tabs in preview/impersonation
