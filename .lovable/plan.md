

# Group Module Selectors by Year — Consistency Audit

## Current State

Only **2 of 9** module selectors group modules by year (PDFLibraryTab, AdminPage user assignment). The rest show a flat or slug-sorted list, making it hard to find modules when there are 43 total.

## What Needs to Change

Apply the same year-grouped pattern from PDFLibraryTab to all 7 remaining module selectors. Each will need `useYears()` added (if not already imported) and the `SelectContent` restructured to loop years first, then filter modules per year.

### Files to Update

| # | File | Current | Has years data? |
|---|------|---------|-----------------|
| 1 | `StructuredCaseCreator.tsx` | Flat list, name only | No — add `useYears()` |
| 2 | `AIBatchGeneratorModal.tsx` | Sorted by slug number | No — add `useYears()` |
| 3 | `AIContentFactoryModal.tsx` | Flat list, name only | No — add `useYears()` |
| 4 | `ActivityLogTab.tsx` | Sorted by slug number | No — add `useYears()` |
| 5 | `ActivityLogPage.tsx` | Sorted by slug number | No — add `useYears()` |
| 6 | `AdminInboxPage.tsx` | Flat list | No — add `useYears()` |
| 7 | `AdminInboxTab.tsx` | Flat list | No — add `useYears()` |

### The Pattern (from PDFLibraryTab)

Each `SelectContent` will be updated to:

```tsx
<SelectContent>
  {years?.sort((a, b) => a.number - b.number).map(year => {
    const yearModules = modules
      ?.filter(m => m.year_id === year.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (!yearModules?.length) return null;
    return (
      <div key={year.id}>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
          {year.name}
        </div>
        {yearModules.map(m => (
          <SelectItem key={m.id} value={m.id}>
            {m.slug?.toUpperCase()}: {m.name}
          </SelectItem>
        ))}
      </div>
    );
  })}
</SelectContent>
```

### MoveToChapterModal (Special Case)

This uses a custom button list instead of `<Select>`. The same year-grouping pattern will be applied by inserting year header dividers between groups of module buttons in the ScrollArea.

### Module Display Format

All selectors will show `SLUG: Name` format (e.g., "ISK-101: Normal Structure of the Human Body") for consistency with the PDFLibraryTab, except filter dropdowns (ActivityLog, Inbox) which will keep shorter names to fit their narrower triggers.

## Impact
- 7 files modified (+ 1 import added to each)
- No logic changes — purely visual grouping
- Consistent UX across all module selectors

