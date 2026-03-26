

## Updated: Mobile Chapter List Readability Fix

### Changes in `src/components/module/ModuleLearningTab.tsx`

1. **Chapter row padding**: `px-4` → `px-2 md:px-4`
2. **Title text**: Change `truncate` to `line-clamp-2 md:truncate` AND reduce font size to `text-xs md:text-sm` (12px on mobile — smallest comfortably readable size for young adults)
3. **Chapter icon**: `w-9 h-9` → `w-7 h-7 md:w-9 md:h-9`
4. **Number badge**: `min-w-[2.5rem]` → `min-w-[2rem] md:min-w-[2.5rem]`, `px-2` → `px-1.5 md:px-2`

Apply to both assigned (clickable) and unassigned chapter row variants.

