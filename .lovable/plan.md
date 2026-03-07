

## Two Changes: Admin Content Tab Reorganization + AI Cases Case-Centric Redesign

### 1. Reorganize Content Group Tabs

The current 7 sub-tabs under "Content" are cluttered. Reorganize into 4 cleaner groups:

| New Tab | Contains (old tabs) |
|---------|-------------------|
| **Curriculum & Sources** | Curriculum + PDF Library |
| **Help & Templates** | Help & Templates (unchanged) |
| **Analytics** | Question Analytics + Content Integrity + AI Cases |
| **Content Factory** | AI Settings / Content Factory (unchanged) |

**File: `src/components/admin/AdminTabsNavigation.tsx`**
- Restructure the `content` group's `tabs` array to have these 4 entries
- The "Analytics" tab will be a parent that, when selected, shows its own sub-navigation (3 inner tabs: Question Analytics, Content Integrity, AI Cases)

**New file: `src/components/admin/ContentAnalyticsTab.tsx`**
- Wrapper component with an inner tab bar for the 3 analytics sub-sections
- Renders `QuestionAnalyticsTabs`, Content Integrity content, or `AICasesAdminTab` based on inner selection

**File: `src/pages/AdminPage.tsx`**
- Merge the Curriculum + PDF Library `TabsContent` blocks into a single "sources" tab with inner sub-tabs
- Add the new `ContentAnalyticsTab` component for the "analytics" tab
- Update deep-link handling for the new tab values

### 2. Redesign AI Cases Admin — Case-Centric View

Current design shows a flat table of student attempts (student as first column). The user wants a **case-centric hierarchy**: Module → Topic/Chapter → Case, with aggregate reports per case, and drill-down to see individual students.

**Redesign `src/components/admin/AICasesAdminTab.tsx`:**

**Level 1 — Case List View (default):**
- Top: Module selector dropdown (scoped by role)
- Below: Cards/rows for each case in that module, showing:
  - Case title, difficulty badge
  - Aggregate stats: total attempts, completion rate, average score, flagged count
  - Click to drill into case detail

**Level 2 — Case Detail View (on click):**
- Header: Case title, difficulty, module/topic breadcrumb
- Summary stats cards (same as current: total attempts, avg score, flagged, cost)
- Student attempts table (current table, but now scoped to one case)
  - Student name, score, time, turns, cost, flagged, date
  - Click row to open transcript modal

**Hook changes in `src/hooks/useAICaseAdmin.ts`:**
- Add `useAICaseAggregates()` — groups attempts by `case_id`, computes per-case stats (count, avg score, completion rate, flagged count)
- Existing `useAICaseAttempts` stays but will always be filtered by `caseId` when in detail view
- Add module filter to `useAICasesInScope`

**UI flow:**
```text
┌─────────────────────────────────┐
│ [Module Dropdown: All / Mod 1]  │
├─────────────────────────────────┤
│ Case: Chest Pain Assessment     │
│ ⬛ 24 attempts · 78% avg · 2 🚩│
│                                 │
│ Case: Diabetic Emergency        │
│ ⬛ 18 attempts · 62% avg · 5 🚩│
│                                 │
│ Case: Asthma Management         │
│ ⬛ 8 attempts · 85% avg · 0 🚩 │
└─────────────────────────────────┘
         ↓ click case
┌─────────────────────────────────┐
│ ← Back to Cases                 │
│ Chest Pain Assessment (Adv.)    │
│ [Stats Cards: 24 att, 78%, ...] │
│ ┌───────────────────────────┐   │
│ │ Student │ Score │ Time │...│   │
│ │ Mona R. │  92%  │ 8m  │...│   │
│ │ Ali K.  │  65%  │ 12m │...│   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

### Files Summary

| File | Change |
|------|--------|
| `AdminTabsNavigation.tsx` | Reorganize content tabs to 4 groups |
| New: `ContentAnalyticsTab.tsx` | Wrapper with inner tabs for 3 analytics views |
| New: `CurriculumSourcesTab.tsx` | Wrapper combining Curriculum + PDF Library |
| `AdminPage.tsx` | Update TabsContent mappings for new tab structure |
| `AICasesAdminTab.tsx` | Full redesign: case list → case detail drill-down |
| `useAICaseAdmin.ts` | Add `useAICaseAggregates` hook, module filter |

