

# Add Progress, Readiness & Unlocks to Module Study Coach Tab

## Problem

The "Study Coach" tab on the module page currently only shows the **Study Plan** (planning). The full Personal Study Coach page (`/progress`) has three sub-tabs -- **Overview** (progress & readiness), **Study Plan** (planning), and **Unlocks** -- but only the Study Plan was carried over to the module page.

## Solution

Embed the same three-tab layout (`LearningHubTabs`) used in the Personal Study Coach page directly into the module page's Study Coach section. This gives students access to all three features (planning, progress/readiness, unlocks) without leaving the module page.

## What Changes

The module page's "Study Coach" section (lines 241-254 of `ModulePage.tsx`) currently renders only `LearningHubStudyPlan`. It will be replaced with `LearningHubTabs`, which includes all three tabs:

1. **Overview** -- Readiness score, coverage, progress map, needs practice, insights
2. **Study Plan** -- Planning wizard, timeline, schedule
3. **Unlocks** -- Formative assessment unlock levels

## File to Modify

| File | Change |
|------|--------|
| `src/pages/ModulePage.tsx` | Replace `LearningHubStudyPlan` with `LearningHubTabs` in the coach section. Add required imports and pass additional props (`dashboard`, `onNavigate`). |

## Technical Details

### ModulePage.tsx

1. **Import change**: Replace `LearningHubStudyPlan` import with `LearningHubTabs` import. Also import `useStudentDashboard`.

2. **Add dashboard hook**: Inside the component, call `useStudentDashboard` with the current module context so the Overview and Unlocks tabs have data:
   ```typescript
   const { data: coachDashboard } = useStudentDashboard({
     yearId: module?.year_id,
     moduleId: actualModuleId,
   });
   ```

3. **Replace the coach section rendering** (lines 241-254): Swap `LearningHubStudyPlan` for `LearningHubTabs`, passing all required props including `dashboard`, `modules`, year info, and an `onNavigate` callback.

### No Other Files Change

`LearningHubTabs` and all its child components (`LearningHubOverview`, `LearningHubStudyPlan`, `LearningHubUnlocks`) already exist and work correctly -- they just need to be wired up in the module page.

