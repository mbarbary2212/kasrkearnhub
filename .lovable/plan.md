

## Mobile Content Optimization Plan

After reviewing `ChapterPage.tsx` (1354 lines), `ModulePage.tsx`, `LectureList.tsx`, `ModuleConnectTab.tsx`, `ModuleFormativeTab.tsx`, and related components, here are the key mobile issues and fixes.

### Problems Identified

1. **Chapter header is cramped** — Back button + icon + title + coach button + customize button all compete on 390px. Section filter also inlines in the header on mobile, pushing content down.
2. **Lecture card action buttons overflow** — Each lecture row shows 5 icon buttons (watched, bookmark, thumbs up, thumbs down, notes) inline, which is too many for small screens. They crowd the title.
3. **Video player modal not mobile-optimized** — `DialogContent` uses `max-w-4xl` with no mobile-specific sizing; the "Note @ timestamp" button gets cut off on small screens.
4. **Filter pills wrap poorly** — Both student engagement filters (All/Watch Later/Watched/Recently Added) and doctor filters stack without horizontal scroll on narrow screens.
5. **Module page chapter list touch targets** — Chapter rows use `py-3 px-4` which is fine, but the readiness dot + chevron area is small.
6. **Connect tab cards lack mobile spacing** — Full-width cards with desktop padding.
7. **Bottom nav padding conflict** — Content can be hidden behind the new bottom nav bar on chapter pages.
8. **MobileSectionDropdown** used for sub-tabs works well but could show the active count more prominently.

### Plan

#### 1. Optimize Chapter Page header for mobile
**File:** `src/pages/ChapterPage.tsx`
- Reduce mobile header gap from `gap-4` to `gap-2`
- Move section filter below the title row on mobile instead of inline
- Stack the AskCoach and Customize buttons vertically or hide labels, keeping icons only (already icon-only, but tighten spacing)
- Reduce chapter title font on mobile: `text-base` instead of `text-lg`

#### 2. Make lecture action buttons scrollable/compact on mobile
**File:** `src/components/content/LectureList.tsx`
- On mobile, collapse the 5 student action buttons into a compact row: show only watched + bookmark inline, put thumbs up/down + notes behind a "more" menu (three-dot button)
- Use `md:flex hidden` / `flex md:hidden` pattern to show different layouts per breakpoint
- Increase lecture row touch target: ensure min-h of 48px

#### 3. Make video player modal full-screen on mobile
**File:** `src/components/content/LectureList.tsx`
- Add mobile-specific classes to `DialogContent`: on small screens use `w-full h-full max-w-full max-h-full rounded-none` for a full-screen video experience
- Move "Note @ timestamp" button below the video on mobile instead of in the header

#### 4. Horizontal-scroll filter pills on mobile
**File:** `src/components/content/LectureList.tsx`
- Wrap filter pill rows in `overflow-x-auto flex-nowrap scrollbar-hide` on mobile so they scroll horizontally instead of wrapping to multiple lines
- Apply same pattern to doctor filter pills

#### 5. Tighten chapter content bottom padding
**File:** `src/pages/ChapterPage.tsx`
- Add `pb-20 md:pb-4` to the main content wrapper to account for the bottom nav bar on mobile

#### 6. Optimize Connect tab cards for mobile
**File:** `src/components/module/ModuleConnectTab.tsx`
- Reduce card padding on mobile: `p-3 md:p-6`
- Stack cards in single column on mobile (likely already single-col, but verify grid gaps)

#### 7. Swipe navigation on Chapter page
**File:** `src/pages/ChapterPage.tsx`
- Wire `useSwipeGesture` to the content area to allow swiping between Resources/Interactive/Practice/Test sections (same pattern already added to ModulePage)

### Files to edit
- `src/pages/ChapterPage.tsx` (header tightening, bottom padding, swipe gestures)
- `src/components/content/LectureList.tsx` (action buttons, filter pills, video modal)
- `src/components/module/ModuleConnectTab.tsx` (card spacing)

### Technical notes
- `useSwipeGesture` hook and `useIsMobile` are already available
- No new files needed — all changes are responsive CSS adjustments and conditional rendering
- Changes are additive (desktop layout untouched)

