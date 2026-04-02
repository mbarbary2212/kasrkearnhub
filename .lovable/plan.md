
# Content Quality Scoring & Flagging System

## Overview
Add a transparent, client-side scoring system that classifies content as **Normal**, **Needs Review** (yellow), or **High Priority** (red) using existing signals. Surface these flags in Content Analytics, Admin Overview, and inline content view.

---

## New Files

### 1. `src/lib/contentQualityScoring.ts` — Scoring Engine
Pure utility with named threshold constants:

```
THRESHOLDS:
  MIN_REACTIONS = 5
  NEGATIVE_RATIO_REVIEW = 0.3
  NEGATIVE_RATIO_HIGH = 0.5
  FEEDBACK_COUNT_REVIEW = 3
  INCORRECT_COUNT_REVIEW = 1
  INCORRECT_COUNT_HIGH = 2

LOGIC:
  HIGH PRIORITY if ANY of:
    - negative ratio > 0.5 with >= 5 reactions
    - incorrect_content feedback >= 2
  
  NEEDS REVIEW if ANY of:
    - negative ratio > 0.3 with >= 5 reactions
    - total feedback >= 3
    - incorrect_content feedback >= 1
  
  Otherwise: NORMAL
```

Exports:
- `ContentQualityFlag` type
- `computeContentQualityFlag(signals: QualitySignals): { flag, reasons: string[] }`
- `getQualityFlagLabel(flag)` / `getQualityFlagColor(flag)` helpers

The `reasons` array provides explainability (e.g. "High negative ratio (52%)", "2 incorrect content reports").

### 2. `src/components/analytics/ContentQualityFlagBadge.tsx` — Reusable Badge
Takes `QualitySignals`, computes flag, renders yellow/red Badge or nothing for normal. Used in analytics tables and admin bar.

---

## Modified Files

### 3. `src/components/analytics/McqAnalyticsDashboard.tsx`
- Add `'needs-review' | 'high-priority'` to `FilterType`
- Add two filter options in the Select: "Needs Review", "High Priority"
- In `filteredAnalytics` memo, add cases that compute flag per item using `qualitySignals` map and filter
- In `renderQuestionRow`, replace `QualitySignalBadges` with `ContentQualityFlagBadge` (which still shows counts but adds the flag badge)
- In summary cards, replace "Flagged by Students" and "Needs Review" cards with computed "Needs Review" and "High Priority" counts from quality scoring

### 4. `src/components/analytics/OsceAnalyticsDashboard.tsx` (if exists)
Same pattern as MCQ dashboard.

### 5. `src/components/admin/ContentItemAdminBar.tsx`
- After the "Admin" Badge, render `ContentQualityFlagBadge` using already-fetched `feedbackData`
- Convert feedbackData to QualitySignals shape inline (helpful/unhelpful counts + feedback breakdown already computed)
- Static badge, visible immediately after data loads, no click needed

### 6. `src/components/analytics/ContentQualitySection.tsx`
- At top of CardContent (before reaction counts), add a flag banner when item is flagged:
  - Alert box: "This item is flagged: **High Priority**" or "**Needs Review**"
  - Below: bullet list of reasons from `computeContentQualityFlag`
  - Example: "High negative ratio (45%)" / "2 incorrect content reports" / "5 total feedback reports"
- Compute flag from same data already loaded (reactions + feedbackByType)

### 7. `src/hooks/useAdminOverviewStats.ts`
- After fetching reactions and feedback, group by `material_id`, build QualitySignals per item, compute flag
- Add `needsReviewCount` and `highPriorityCount` to `AdminOverviewStats` interface

### 8. `src/pages/AdminOverview.tsx`
- In "Needs Attention" section, add two new rows:
  - "High priority content" (red background) — navigates to `/admin?tab=content-analytics`
  - "Content needs review" (yellow background) — same navigation
- In "Content Health" section, replace/augment "Flagged" stat with "High Priority" and "Needs Review" counts

---

## Key Design Decisions
- **No new DB tables** — all computed client-side from existing `material_reactions`, `material_feedback`
- **Reuses existing `useQualitySignals` batch hook** — no per-item queries
- **Thresholds are named constants** — easy to adjust without code changes
- **Reasons array** makes flags explainable to admins
- **Lazy loading preserved** in ContentItemAdminBar — badge appears after data loads
