

## Plan: Add Interactive Section & Reorder Navigation

### Overview
Create a new **"Interactive"** section (Cases + Pathways) as a 4th top-level section, positioned between Resources and Practice. Move Clinical Cases out of Practice and Algorithms out of Clinical Tools into this new section.

### Navigation Order (Before → After)

```text
BEFORE:                    AFTER:
1. Resources               1. Resources
2. Practice                 2. Interactive  ← NEW
3. Test Yourself            3. Practice
                            4. Test Yourself
```

### Files to Change

#### 1. `src/config/tabConfig.ts`
- Add `InteractiveTabId = 'cases' | 'pathways'` type
- Add `INTERACTIVE_TABS` array: Cases (Stethoscope icon, label "Cases") and Pathways (GitBranch icon, label "Pathways")
- Add `createInteractiveTabs()` helper with counts
- Remove `clinical_cases` from `PRACTICE_TABS` and `PracticeTabId`

#### 2. `src/pages/ChapterPage.tsx`
- Change `SectionMode` to `'resources' | 'interactive' | 'practice' | 'test'`
- Add `interactiveTab` state (`'cases' | 'pathways'`)
- Reorder `sectionNav`: Resources → Interactive (Sparkles icon, amber color) → Practice → Test Yourself
- Add `interactive` entry to `sectionColors` (amber accent)
- Add `interactiveTabs` memo with counts from `clinicalCaseCount` and `interactiveAlgorithms.length`
- Add Interactive section rendering block with sub-tab pills + Cases content (existing `ClinicalCaseAdminList`/`ClinicalCaseList`) + Pathways content (algorithm list + builder from `ClinicalToolsSection`)
- Remove `clinical_cases` rendering from Practice section
- Update `clinical_tools` count to only include Worked Cases (exclude algorithms)

#### 3. `src/pages/TopicDetailPage.tsx`
- Mirror all ChapterPage changes: same `SectionMode`, `interactiveTab` state, reordered `sectionNav`, `sectionColors`, Interactive section rendering
- Remove `clinical_cases` from Practice section
- Update `clinical_tools` count to exclude algorithms

#### 4. `src/components/study/ClinicalToolsSection.tsx`
- Remove the Algorithms sub-tab entirely (algorithms now live in the Interactive section)
- Simplify to only render Worked Cases (remove Tabs wrapper if only one type remains)

### What Stays Unchanged
- All database tables, hooks, data fetching, RLS policies
- `AlgorithmList`, `AlgorithmBuilderModal`, `AlgorithmBulkUploadModal`, `AlgorithmPlayer` components
- `ClinicalCaseList`, `ClinicalCaseAdminList`, `ClinicalCaseBuilderModal` components
- All edge functions, progress tracking, section filtering

