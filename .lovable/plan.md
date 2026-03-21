

# Fix Build Error & Enable Sections for Surgery Module

## 1. Fix Build Error in VideosManagementTab.tsx

The `filteredHierarchy` variable (declared at line 432 with `useMemo`) is used in `useEffect` hooks at lines 409 and 417 — before its declaration. Block-scoped variables cannot be used before declaration.

**Fix**: Move the `useMemo` block (lines 431-440) to right after line 405 (after `queryClient`), before the `useEffect` hooks that depend on it.

## 2. Enable Sections for All Surgery 523 Chapters

Run a database update to set `enable_sections = true` for all chapters in the surgery module that don't already have it enabled:

```sql
UPDATE module_chapters
SET enable_sections = true
WHERE module_id = '7f5167dd-b746-4ac6-94f3-109d637df861'
  AND enable_sections = false;
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/admin/VideosManagementTab.tsx` | Move `filteredHierarchy` useMemo before the useEffect hooks |
| Database | Enable sections for remaining surgery chapters |

