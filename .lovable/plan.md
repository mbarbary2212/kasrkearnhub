

# Fix Blueprint Table: Sticky Header, State Persistence, and Data Verification

## What I Found

### Is the data actually missing?
**No — the data is fully populated.** SUR-523 has **1,074 blueprint configs** across all 30 chapters (155 chapter-level + 919 section-level). Every single chapter has between 7 and 54 configurations. The "bottom part not populated" appearance is a **UI problem, not a data problem** — when you scroll down, the table header scrolls away, so you lose track of which column is which, making it look like the bottom rows are empty or broken.

### Why does it look empty at the bottom?
The table uses Radix `ScrollArea` with **no height constraint**. This means `sticky top-0` on the `<thead>` doesn't work — the header scrolls out of view with the page. Without visible column headers, the bottom chapters' colored badges (H/A/L) lose context.

### Why do Year/Module reset when switching tabs?
Each subtab (Chapter Blueprint, Exam Structure, etc.) manages its own `useState('')` for year and module. When you switch tabs, the component unmounts and state is lost.

## Plan

### Step 1: Lift Year/Module state to parent
Move `selectedYearId` and `selectedModuleId` from each subtab into `AssessmentBlueprintTab.tsx`. Pass them as props so selections persist across all four subtabs.

**Files:** `AssessmentBlueprintTab.tsx`, `ChapterBlueprintSubtab.tsx`, `ExamStructureSubtab.tsx`, `TopicWeightsSubtab.tsx`, `ValidationSummarySubtab.tsx`

### Step 2: Fix sticky table header
Replace `<ScrollArea>` around the blueprint table with a plain `<div className="max-h-[70vh] overflow-auto border rounded-md">`. This gives the `<thead sticky top-0>` an actual scroll container to stick within, keeping column headers visible while scrolling through chapters.

**File:** `ChapterBlueprintSubtab.tsx`

### Step 3: Verify data displays correctly
After the UI fixes, all 30 chapters should show their H/A/L badges with visible column headers. No data import is needed — the 1,074 configs are already in the database. The RECONCILED file upload is not required since the existing data is complete.

