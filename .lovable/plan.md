

# Apply Year-Grouped Module Selectors Across All Remaining Files

Three files still use flat module lists instead of `YearGroupedModuleOptions`. The StudentDashboard is excluded since it already filters by year first (modules shown are already scoped to one year).

## Files to Update

| File | Current | Change |
|------|---------|--------|
| `src/components/admin/PDFLibraryTab.tsx` | Custom slug-sort `.map()` | Replace with `<YearGroupedModuleOptions>` |
| `src/components/admin/AICasesAdminTab.tsx` | Flat `.map(m => ...)` | Replace with `<YearGroupedModuleOptions>` |
| `src/components/announcements/AnnouncementFormModal.tsx` | Flat `.map(m => ...)` | Replace with `<YearGroupedModuleOptions>` (respecting the `isModuleAdminOnly` filter) |

## What stays unchanged
- **StudentDashboard** — already year-scoped (user picks year first, then module within that year), so grouping by year is redundant
- All files already using `YearGroupedModuleOptions` (ActivityLogTab, AdminInboxTab, AdminInboxPage, ActivityLogPage, StructuredCaseCreator, AIContentFactoryModal, AIBatchGeneratorModal)

## Implementation detail
Each file will:
1. Import `YearGroupedModuleOptions`
2. Replace the inline `.map()` with `<YearGroupedModuleOptions modules={...} />`
3. For AnnouncementFormModal, pass the filtered module list when `isModuleAdminOnly` is true

