

## Plan: Match Inner Sub-Tab Colors to Their Parent Section Colors

### Problem
Each section in the sidebar has a distinct color identity (Blue, Amber, Emerald, Violet), but the inner sub-tabs don't follow the same colors. Interactive uses teal instead of amber, Resources and Practice both use the generic `bg-accent` (teal), and Test Yourself has completely colorless MCQ/OSCE tabs. This makes it easy to miss tabs like OSCE.

### Solution
Apply the same outlined-pill pattern used for Interactive tabs to all four sections, each using its parent section's color:

```text
Section        Sidebar Color    Inner Tab Active              Inner Tab Inactive
─────────────  ──────────────   ────────────────────────────  ──────────────────────────────
Resources      Blue             bg-blue-600 text-white        border-blue-300 bg-blue-50
Interactive    Amber            bg-amber-500 text-white       border-amber-300 bg-amber-50
Practice       Emerald          bg-emerald-600 text-white     border-emerald-300 bg-emerald-50
Test Yourself  Violet           bg-violet-600 text-white      border-violet-300 bg-violet-50
```

### Changes

#### 1. `src/pages/ChapterPage.tsx`

**Resources sub-tabs** (lines 547-551): Replace generic `bg-accent` with blue pill styling:
- Active: `bg-blue-600 text-white font-medium shadow-sm border-blue-600`
- Inactive: `border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100`
- Add `border` to the base classes

**Interactive sub-tabs** (lines 768-770): Change teal to amber to match sidebar:
- Active: `bg-amber-500 text-white font-medium shadow-sm border-amber-500`
- Inactive: `border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100`

**Practice sub-tabs** (lines 854-858): Replace generic `bg-accent` with emerald pill styling:
- Active: `bg-emerald-600 text-white font-medium shadow-sm border-emerald-600`
- Inactive: `border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`
- Add `border` to the base classes

#### 2. `src/pages/TopicDetailPage.tsx`
Mirror the exact same changes for all three sections (Resources, Interactive, Practice).

#### 3. `src/components/exam/ChapterMockExamSection.tsx` (lines 116-136)
Replace the generic `TabsList`/`TabsTrigger` with custom styled pill buttons matching the violet theme:
- Active: `bg-violet-600 text-white font-medium shadow-sm border-violet-600`
- Inactive: `border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100`

This converts the MCQ/OSCE switcher from a plain gray tab bar to violet-themed pills that match the "Test Yourself" sidebar color.

### Result
Every section's inner tabs now use the same color as their parent sidebar indicator. Users immediately see all available sub-tabs as visible, clickable pills. The OSCE tab in Test Yourself will no longer be missed because it stands out in violet alongside MCQ.

### Files
- `src/pages/ChapterPage.tsx` — 3 sub-tab blocks updated
- `src/pages/TopicDetailPage.tsx` — 3 sub-tab blocks updated  
- `src/components/exam/ChapterMockExamSection.tsx` — MCQ/OSCE tabs restyled

