

## Fix Mobile Chapter List Display

The mobile chapter list fix was only partially applied. There are **3 separate chapter list render blocks** in `ModuleLearningTab.tsx`, and **block 2 (lines 500–555)** was never updated. This is the block matching your screenshot — it still shows chapter index numbers, full untruncated titles, and no mobile-specific optimizations.

### What's wrong

| Render block | Location | Mobile fixes applied? |
|---|---|---|
| Block 1 (book-based chapters) | Lines 300–380 | Partially — still shows index numbers on mobile |
| Block 2 (department chapters) | Lines 500–555 | **None** — this is what your screenshot shows |
| Block 3 (general/prefix chapters) | Lines 780–850 | Yes — index hidden, titles truncated |

### Changes (single file: `ModuleLearningTab.tsx`)

**Block 1 (lines 300–380)** — hide index number on mobile:
- Change the chapter number `<span>` to `hidden md:inline` (matching block 3)
- Already has `shortenTitle` and `line-clamp-2` — keep those

**Block 2 (lines 500–555)** — apply all mobile fixes:
- Hide chapter index number on mobile (`hidden md:inline`)
- Add `min-w-0` to button/container for proper truncation
- Use `shortenTitle()` on mobile, full title on desktop (matching block 1 pattern)
- Change title to `text-xs md:text-sm` with `truncate min-w-0`
- Reduce icon size on mobile: `w-7 h-7 md:w-9 md:h-9`
- Reduce padding on mobile: `px-2 md:px-4`
- Wrap readiness dot + chevron in fixed-width container with chevron hidden on mobile (matching block 3)

### Result
All 3 chapter list blocks will have consistent mobile behavior: no index numbers, truncated titles, compact spacing.

