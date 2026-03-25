

# Fix Back Arrow Navigation Across the App

## Problem

The back arrow on multiple pages navigates to the wrong destination:

| Page | Current Back Target | Correct Parent |
|------|-------------------|----------------|
| **YearPage** | `/` (Home) | `/` (Home) — OK but sets `skipAutoLogin` unnecessarily |
| **ModulePage** | `/year/{number}` | `/year/{number}` — OK |
| **ChapterPage** | `/module/{id}?section=learning` | OK |
| **TopicDetailPage** | `/module/{moduleId}` | Should go to `/module/{moduleId}/chapter/{chapterId}` |
| **DepartmentPage** | `navigate(-1)` (browser back) | Should navigate to parent module |
| **BlueprintExamPage** | Back via `navigate(-1)` or `onBack` | Should go to `/module/{moduleId}` |
| **ExamResultsPage** | Needs checking | Should go to `/module/{moduleId}` |
| **FlashcardReviewPage** | `/` (Home) | Should go back to the chapter or module it came from |
| **CaseSummaryPage** | `navigate(-1)` | Should go to chapter's Interactive section |

The **YearPage** back arrow is the most visible issue — it calls `handleGoHome` which sets `skipAutoLogin` and goes to `/`, which shows the year selection screen instead of behaving as a normal back. For students with a preferred year, this is confusing.

## Plan

### Step 1: Fix YearPage back arrow
**File: `src/pages/YearPage.tsx`**
- Change the back arrow `onClick` from `handleGoHome` (which sets `skipAutoLogin` + navigates to `/`) to a simple `navigate('/')` without setting the skip flag. This lets the Home page redirect logic work normally.

### Step 2: Fix TopicDetailPage back arrow
**File: `src/pages/TopicDetailPage.tsx`**
- Currently navigates to `/module/${moduleId}` — should navigate to `/module/${moduleId}/chapter/${chapterId}` to return to the parent chapter, not skip up two levels.

### Step 3: Fix DepartmentPage back arrow  
**File: `src/pages/DepartmentPage.tsx`**
- Replace `navigate(-1)` with explicit parent navigation based on available context (module or year).

### Step 4: Fix FlashcardReviewPage exit/back
**File: `src/pages/FlashcardReviewPage.tsx`**
- Replace `navigate('/')` with navigation back to the originating chapter or module. If no referrer context exists, fall back to `/`.

### Step 5: Fix CaseSummaryPage back arrow
**File: `src/components/clinical-cases/CaseSummary.tsx`**
- Replace `navigate(-1)` with explicit navigation to the chapter's Interactive section when chapter context is available.

### Files Modified
- `src/pages/YearPage.tsx`
- `src/pages/TopicDetailPage.tsx`
- `src/pages/DepartmentPage.tsx`
- `src/pages/FlashcardReviewPage.tsx`
- `src/components/clinical-cases/CaseSummary.tsx`

