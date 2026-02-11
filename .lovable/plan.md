

# Remove Collapsible Sidebar -- Revert to Fixed Rail

## What changes

Revert the chapter and topic page left navigation rail from the collapsible hover-expand behavior back to a fixed 180px rail that always shows icons and labels.

## Files to modify

### `src/pages/ChapterPage.tsx`
- Remove the `isNavHovered` state variable (line 110)
- Remove the `Tooltip`/`TooltipProvider` wrapper, `onMouseEnter`/`onMouseLeave` handlers, and dynamic `style={{ width }}` from the desktop nav rail
- Restore a fixed `w-[180px]` rail with icons and labels always visible
- Remove the `Tooltip`/`TooltipContent` imports if no longer used elsewhere in the file

### `src/pages/TopicDetailPage.tsx`
- Same changes as ChapterPage for parity
- Remove `isNavHovered` state (line 102)
- Restore fixed `w-[180px]` rail with always-visible labels

## Result

The desktop left rail will always show at 180px with both icons and text labels visible -- no hover interaction, no collapsing. Mobile horizontal tabs remain unchanged. The Study Coach addition to the Module page nav is unaffected.

