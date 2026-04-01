

# Content Deep-Link & Admin Action Bar — Implementation Plan

## Current State

- **Inquiries** have `module_id`, `chapter_id`, `topic_id` columns but no `material_type` or `material_id` — most inquiries only have `module_id` (chapter/topic are usually null)
- **Chapter route**: `/module/:moduleId/chapter/:chapterId` with query params `?section=practice&subtab=mcqs`
- **Analytics**: `McqAnalyticsDashboard` rows open a detail modal (`McqAnalyticsDetailModal`). Each row has `mcq_id`, `module_id`, `chapter_id`
- **No existing highlight/scroll-to-item mechanism** in ChapterPage

## Plan

### Step 1 — Build Content Link Utility

Create `src/lib/contentNavigation.ts`:

- `buildContentLink(params)` — generates a URL like `/module/{moduleId}/chapter/{chapterId}?section=practice&subtab=mcqs&highlight={mcqId}&from=inbox`
- Maps material types to the correct section + subtab (e.g., `mcq` → `practice/mcqs`, `video`/`lecture` → `resources/lectures`, `osce` → `practice/osce`, `flashcard` → `resources/flashcards`, `case` → `interactive/cases`)
- Accepts optional `from` param (`inbox` | `analytics`) for the context banner
- Handles fallback: if only `module_id` available, links to `/module/{moduleId}`; if only `module_id` + `chapter_id`, links to chapter without highlight

### Step 2 — Add "Open Content" Button to Inquiry Detail Sheet

In `AdminInboxPage.tsx` `InquiryDetailSheet`:

- Below the metadata grid, add an "Open Content" button (using `ExternalLink` icon)
- Only show when `module_id` exists (at minimum)
- Uses `buildContentLink` with `inquiry.module_id`, `inquiry.chapter_id`, `from='inbox'`
- If only `module_id` available (no chapter), navigates to module page
- Uses `navigate()` or `window.open()` in new tab

### Step 3 — Add "Open Content" to Analytics Detail Modal

In `McqAnalyticsDetailModal.tsx`:

- Add an "Open in Content" button in the modal header area
- Uses `buildContentLink` with `analytics.module_id`, `analytics.chapter_id`, `analytics.mcq_id`, `materialType='mcq'`, `from='analytics'`
- Opens chapter page at the exact MCQ

### Step 4 — Highlight Target Content in ChapterPage

In `ChapterPage.tsx`:

- Read `highlight` and `from` from `searchParams`
- On mount, if `highlight` param exists:
  - Auto-switch to the correct `section` and `subtab` (already handled by existing `?section=&subtab=` params)
  - After content loads, find the DOM element with `data-content-id={highlightId}` and scroll into view
  - Apply a temporary CSS highlight (ring + pulse animation, 3 seconds, then fade)
- Add `data-content-id` attributes to MCQ cards, OSCE items, etc. in their respective list components (`McqList`, `OsceList`, etc.)

### Step 5 — Context Banner in ChapterPage

In `ChapterPage.tsx`:

- If `from` search param is present (`inbox` or `analytics`), show a small dismissible banner at top:
  - "Opened from Inbox" or "Opened from Analytics"
  - "Back to Inbox" / "Back to Analytics" link
- Auto-dismiss after navigation or manual close

### Step 6 — Admin Action Bar on Content Items

Create `src/components/admin/ContentItemAdminBar.tsx`:

- Small inline bar shown above/beside content cards (MCQ, OSCE, etc.) when `isAdmin`
- Actions: "Edit" (triggers existing edit modal if available), "View Analytics" (links to analytics with the item pre-selected), "Mark for Review" (uses existing `useUpsertReviewNote`)
- Only visible for admin roles — does not affect student UI
- Add this component to `McqList` item rendering (and optionally `OsceList`, etc.) behind `isAdmin` check

### Step 7 — Update Overview Deep Links

In `AdminOverview.tsx`:

- Ensure "Unanswered questions" links already point to `/admin/inbox?urgency=overdue` (already done in previous session)
- No additional changes needed unless links are broken

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/contentNavigation.ts` | New — URL builder utility |
| `src/pages/AdminInboxPage.tsx` | Add "Open Content" button in InquiryDetailSheet |
| `src/components/analytics/McqAnalyticsDetailModal.tsx` | Add "Open in Content" button |
| `src/pages/ChapterPage.tsx` | Read `highlight`/`from` params, scroll + highlight logic, context banner |
| `src/components/content/McqList.tsx` | Add `data-content-id` attribute to items |
| `src/components/content/OsceList.tsx` | Add `data-content-id` attribute to items |
| `src/components/admin/ContentItemAdminBar.tsx` | New — admin action bar component |
| `src/components/content/McqList.tsx` | Render `ContentItemAdminBar` for admins |

## Files Created

- `src/lib/contentNavigation.ts`
- `src/components/admin/ContentItemAdminBar.tsx`

## No Database Changes

All data exists. Inquiries have `module_id` and `chapter_id`. Analytics have `mcq_id`, `module_id`, `chapter_id`. Content items have their own IDs. No new tables or columns needed.

