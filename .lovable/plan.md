

# Plan: Remove Cross-Listing & Add SUR-423 Book 1 to SUR-523

## Summary
Remove the Year 4 cross-listing (MED-422 & SUR-423) from the Year 5 dashboard, and instead make SUR-423's Book 1 accessible through SUR-523 as a third book. Students will see 3 books in SUR-523 without knowing the data originates from SUR-423.

## Changes

### 1. Remove Cross-Listing from Year 5 Page
**File: `src/pages/YearPage.tsx`**
- Remove the `CROSS_LISTED_IDS` array and all related logic (the `useModulesByIds` hook call, the `crossListedLoading` state, the `allModules` merge, and all `isYear4CrossListed` references)
- Year 5 will only show its own modules natively

### 2. Remove Cross-Listing Note from Home Page
**File: `src/pages/Home.tsx`**
- Remove the `SUR-523: Surgery 2` note shown on Year 5 card (line ~177) if it was related to cross-listing

### 3. Add Book 1 Record to SUR-523
**Database migration**: Insert a `module_books` row for SUR-523 (`7f5167dd-b746-4ac6-94f3-109d637df861`) with `book_label = 'Book 1'`, `display_order = 0`, and `chapter_prefix = 'Ch'` — pushing existing Book 2 and Book 3 to orders 1 and 2

### 4. Cross-Module Chapter Fetching for Book 1
**File: `src/components/module/ModuleLearningTab.tsx`**
- In the `BookLecturesView` component's chapter query (lines 211-224), add logic: when `moduleId` is SUR-523 and `bookLabel` is `'Book 1'`, fetch chapters from SUR-423's module_id instead
- Define a constant mapping:
```text
CROSS_MODULE_BOOKS = {
  '7f5167dd-...': { 'Book 1': '153318ba-...' }
}
// SUR-523's Book 1 → fetch from SUR-423
```
- This keeps all chapter data in SUR-423; SUR-523 just displays it
- Chapter navigation (clicking a chapter) will route to `/module/SUR-523-id/chapter/:chapterId` — need to verify this works since the chapter's `module_id` is actually SUR-423

### 5. Fix Chapter Navigation
**File: `src/components/module/ModuleLearningTab.tsx`**  
- In `BookLecturesView`, the navigate call uses `moduleId` prop (SUR-523), but the chapter belongs to SUR-423. The chapter page loads content by `chapterId`, so it should work. However, back-navigation from the chapter page uses `module_id` from the chapter record — need to override the navigation to use SUR-523's ID
- Pass the "display module ID" through the route so back-navigation returns to SUR-523

### 6. Update Chapter Count Query
**File: `src/components/module/ModuleLearningTab.tsx`**  
- The `book-chapter-counts` query (lines 452-470) counts chapters per book for the current module. For SUR-523's Book 1, also count from SUR-423's Book 1 to show correct counts on the book cards

## Technical Details

- **Cross-module mapping** is defined as a simple constant object — easy to remove later when the user wants to separate Book 1 back to only SUR-423
- **No data duplication** — chapters stay in SUR-423's module_chapters rows
- **Navigation concern**: Chapter pages typically use the chapter's own `module_id` for back-navigation. Since the chapter belongs to SUR-423, we may need to pass an override via query param (e.g., `?from=SUR-523-id`) so back-nav returns to SUR-523

