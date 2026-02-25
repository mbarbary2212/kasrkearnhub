

## Plan: Add Interactive Section & Reorder Navigation — ✅ COMPLETED

### Overview
Created a new **"Interactive"** section (Cases + Pathways) as a 4th top-level section, positioned between Resources and Practice. Moved Clinical Cases out of Practice and Algorithms out of Clinical Tools into this new section.

### Navigation Order

```text
1. Resources
2. Interactive  ← NEW (amber accent, Sparkles icon)
3. Practice
4. Test Yourself
```

### Changes Made

1. **`src/config/tabConfig.ts`** — Added `InteractiveTabId`, `INTERACTIVE_TABS`, `createInteractiveTabs()`. Removed `clinical_cases` from `PracticeTabId` and `PRACTICE_TABS`.

2. **`src/pages/ChapterPage.tsx`** — Added `interactive` to `SectionMode`, `interactiveTab` state, reordered `sectionNav`, added amber `sectionColors` entry, added `interactiveTabs` memo, added Interactive section rendering (Cases + Pathways with full algorithm builder/bulk upload support), removed `clinical_cases` from Practice.

3. **`src/pages/TopicDetailPage.tsx`** — Mirrored all ChapterPage changes for topic-level navigation.

4. **`src/components/study/ClinicalToolsSection.tsx`** — Simplified to only render Worked Cases (removed Algorithms sub-tab and Tabs wrapper).
