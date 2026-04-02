

# Content Quality Scoring & Flagging System

## Overview
Add a transparent, client-side scoring system that classifies content as **Normal**, **Needs Review** (yellow), or **High Priority** (red) using existing signals. Surface these flags in Content Analytics, Admin Overview, and inline content view.

---

## New Files

### 1. `src/lib/contentQualityScoring.ts` — Scoring Engine
Pure utility with named threshold constants:

```text
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
- `ContentQualityFlag` type (`'normal' | 'needs_review' | 'high_priority'`)
- `computeContentQualityFlag(signals): { flag, reasons: string[] }` -- reasons array provides explainability
- `getQualityFlagLabel(flag)` / `getQualityFlagColor(flag)` helpers

### 2. `src/components/analytics/ContentQualityFlagBadge.tsx` — Reusable Badge
Takes `QualitySignals`, computes flag, renders yellow/red Badge or nothing for normal. Used everywhere.

---

## Modified Files

### 3. `McqAnalyticsDashboard.tsx` — Analytics Table
- Add `'needs-review' | 'high-priority'` filter options
- Compute flag per item using `qualitySignals` map in filter logic
- Replace `QualitySignalBadges` column with `ContentQualityFlagBadge`
- Update summary cards with computed "Needs Review" and "High Priority" counts

### 4. `ContentItemAdminBar.tsx` — Inline Badge
- Render `ContentQualityFlagBadge` after "Admin" badge using already-fetched `feedbackData`
- Static, visible immediately after data loads

### 5. `ContentQualitySection.tsx` — Explain the Flag
- At top of card, show alert banner when flagged: "This item is flagged: **High Priority**"
- Bullet list of reasons (e.g. "High negative ratio (45%)", "2 incorrect content reports")
- Uses same data already loaded

### 6. `useAdminOverviewStats.ts` — Aggregate Counts
- Group reactions/feedback by `material_id`, compute flag per item
- Add `needsReviewCount` and `highPriorityCount` to stats

### 7. `AdminOverview.tsx` — Needs Attention Section
- Add "High priority content" (red) and "Content needs review" (yellow) rows
- Both navigate to `/admin?tab=content-analytics`

---

## Design Principles
- No new DB tables -- all client-side from existing `material_reactions` + `material_feedback`
- Reuses existing `useQualitySignals` batch hook -- no per-item queries
- Thresholds as named constants -- easy to adjust
- Reasons array makes every flag explainable to admins

