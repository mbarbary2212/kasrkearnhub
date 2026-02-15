

## Remove Legacy Mock Exam Card from Student View

The legacy "Full Module Mock Exam" card is still showing to students. Students should only see the Blueprint Final Exam papers that admins have configured -- students have no control over exam structure.

### What Changes

**File: `src/components/module/ModuleFormativeTab.tsx`**

1. **Hide the legacy "Full Module Mock Exam" card from students** -- Wrap lines ~79-118 (the `<Card>` with `GraduationCap` icon and "Full Module Mock Exam" title) inside `{isAdmin && (...)}` so only admins see it as a legacy tool. Students will only see the Blueprint Final Exam cards that admins have configured.

2. **Update subtitle** -- Change "Test your knowledge with timed exams or chapter-level practice" to "Test your knowledge with timed exam simulations" since the old flow is being retired.

This is a two-line change. No logic, routing, or component changes needed.

