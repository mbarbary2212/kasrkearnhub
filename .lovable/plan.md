

## Chapter Header Reorganization

### Current State
The chapter header has:
1. Back arrow + chapter title + section filter on one row
2. Ask Coach on a separate row below
3. Section tabs (Resources/Interactive/Practice/Test) as a left nav rail further down

### Changes

**File: `src/pages/ChapterPage.tsx`**

**1. Remove chapter title from the page header** (lines 536-555)
- Delete the `<h1>` elements showing `chapter?.title` from both desktop and mobile headers
- The title is already visible in the top breadcrumb, so it's redundant

**2. Put SectionFilter and Ask Coach on the same row as the back arrow** (lines 524-597)
- Restructure the header into a single row: `[← Back] [SectionFilter] [ContentDropdown] [Ask Coach]`
- Remove the separate mobile and desktop Ask Coach blocks
- Place everything in one `flex items-center` row with appropriate gaps

**3. Add a content-type dropdown between SectionFilter and Ask Coach**
- Create a new dropdown (using shadcn `DropdownMenu` or a select-style button) showing the four section modes: Resources, Interactive, Practice, Test Yourself
- Display the currently active section label with its icon on the trigger button
- When a section is selected, update `activeSection` state
- Style it as a pill/button similar to the SectionFilter dropdown
- Use the existing `sectionNav` array and `sectionColors` for labels/icons/colors

### Result Layout
```text
[← Back]  [All Sections ▾]  [Resources ▾]  [Ask Coach]
```

The content-type dropdown replaces the left nav rail as the primary way to switch between Resources/Interactive/Practice/Test on this header row.

