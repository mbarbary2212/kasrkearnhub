

## Problem

The module Dashboard tab only appears for the ONE module matching the student's `student_last_position` row. Since this table stores only the latest position, the Dashboard is invisible for all other modules, even if the student has visited them before.

## Solution

Remove the dependency on `lastPosition` matching the current module. Instead, always show the Dashboard tab for students, making it the default landing section for any module.

### Changes

**File: `src/pages/ModulePage.tsx`**

1. **Always show Dashboard tab for students** -- Remove the `hasVisitedModule` guard from the `sectionNav` array. Every student sees Dashboard / Learning / Connect / Formative / Coach.

2. **Default to Dashboard for students** -- Change the initial `activeSection` from `'learning'` to `'dashboard'` when the user is a student (and no explicit `?section=` param is in the URL). Remove the `hasAutoSwitched` useEffect entirely since it's no longer needed.

3. **Keep the "Continue where you left off" card** -- The existing `showContinueCard` check (`lastPos.module_id === actualModuleId`) stays so the Continue card only shows when the student's last position is in THIS module.

**File: `src/components/module/ModuleDashboard.tsx`**

4. **No changes needed** -- The component already handles `lastPosition` being null gracefully (the Continue button simply hides). The greeting, stat cards, flashcard widget, and study plan all work independently.

### Key Logic Change

```text
Before:
  sectionNav includes Dashboard only if lastPos.module_id === currentModuleId
  Default section = 'learning', auto-switch via useEffect if lastPos matches

After:
  sectionNav always includes Dashboard for students
  Default section = 'dashboard' for students (no explicit param)
  No auto-switch effect needed
```

### What Does NOT Change
- No colours or fonts change
- No new database tables or migrations
- Mobile sidebar behaviour unchanged
- The "Continue" card still only shows when lastPos matches this module
- Admin/teacher view unchanged (they still default to Learning)

