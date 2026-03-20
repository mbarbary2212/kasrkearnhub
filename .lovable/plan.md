

## Plan: Refactor AdminPage to use useAdminData hook

Replace local state management (`useState` + `useEffect`) in `AdminPage.tsx` with the centralized `useAdminData` hook, and propagate the removal of `setModules` through `CurriculumSourcesTab` and `CurriculumTab`. All mutation handlers will use `queryClient.invalidateQueries({ queryKey: ['admin-data'] })` instead of manual state updates.

### File 1 — `src/pages/AdminPage.tsx` (16 surgical edits)

| Step | Line(s) | Change |
|------|---------|--------|
| A | 1 | Add two imports: `useQueryClient` from react-query, `useAdminData, UserWithRole` from hook |
| B | 24 | Trim import to `import { AppRole } from '@/types/database'` |
| C | 25 | Trim import to `import type { Year, Module } from '@/types/curriculum'` |
| D | 55–59 | Delete local `UserWithRole` interface (now imported) |
| E | 999–1003 | Delete 5 `useState` lines (users, departments, years, modules, isLoading) |
| F | after 1026 | Add `queryClient`, `useAdminData` call, and derived `users/departments/years/modules` consts |
| G | 1096–1170 | Delete entire `fetchData` useEffect |
| H | 1196–1202 | Replace `setUsers(prev=>...)` with `queryClient.invalidateQueries` |
| I | 1234–1251 | Replace `setUsers(prev=>...)` with `queryClient.invalidateQueries` |
| J | 1284–1303 | Replace `setUsers(prev=>...)` with `queryClient.invalidateQueries` |
| K | 1330–1340 | Replace `setUsers(prev=>...)` with `queryClient.invalidateQueries` |
| L | 1393 | Replace `setModules(prev=>...)` with `queryClient.invalidateQueries` |
| M | 1424 | Replace `setModules(prev=>...)` with `queryClient.invalidateQueries` |
| N | 1448 | Replace `setModules(prev=>...)` with `queryClient.invalidateQueries` |
| O | 1485 | Change `isLoading` to `adminDataLoading` |
| P | 2244–2249 | Remove `setModules={setModules}` prop from `<CurriculumSourcesTab>` |

### File 2 — `src/components/admin/CurriculumSourcesTab.tsx`

- Remove `setModules` from interface and component signature
- Remove `setModules={setModules}` from `<CurriculumTab>` passthrough

### File 3 — `src/components/admin/CurriculumTab.tsx`

- Add `import { useQueryClient } from '@tanstack/react-query'`
- Remove `setModules` from interface and component signature
- Add `const queryClient = useQueryClient()` at top of function body
- Replace 3 `setModules(prev=>...)` calls (lines 95, 126, 150) with `queryClient.invalidateQueries({ queryKey: ['admin-data'] })`

### What stays untouched
- URL tab sync useEffect (lines 1068–1073)
- Module form state (showModuleDialog, editingModule, moduleForm)
- All other files
- All student-facing pages

