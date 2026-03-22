

# Fix Module Admin Access Control (4 Changes)

## 1. `src/hooks/useAuth.ts` — `canManageModule()` (line 278-280)
Remove `'department_admin'` from the blanket return-true check so department admins fall through to the `moduleAssignments` check below.

Change: `if (state.role === 'department_admin' || state.role === 'admin' || state.role === 'teacher')` → `if (state.role === 'admin' || state.role === 'teacher')`

## 2. `src/hooks/useModuleAdmin.ts` — `useIsModuleAdmin()` (line 14)
Remove `isTeacher` from the early-return so department_admin/teacher users go through the `module_admins` table lookup.

Change: `if (isSuperAdmin || isPlatformAdmin || isTeacher) return true` → `if (isSuperAdmin || isPlatformAdmin) return true`

## 3. `src/components/admin/AdminTabsNavigation.tsx` — Users tab (line 42)
Restrict the Users tab visibility to super/platform admins only.

Change: `visible: true` → `visible: isSuperAdmin || isPlatformAdmin`

## 4. `src/pages/YearPage.tsx` — Module list (lines 84-104)
Import `useAuthContext`, check `auth.isModuleAdmin`. For module admin users, grey out and disable clicking on modules not in `auth.moduleAdminModuleIds`. Apply `opacity-50 cursor-default` and remove `onClick`/chevron for non-assigned modules.

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Remove `department_admin` from `canManageModule` blanket check |
| `src/hooks/useModuleAdmin.ts` | Remove `isTeacher` from early return in `useIsModuleAdmin` |
| `src/components/admin/AdminTabsNavigation.tsx` | Gate Users tab behind `isSuperAdmin \|\| isPlatformAdmin` |
| `src/pages/YearPage.tsx` | Import auth context, grey out unassigned modules for module admins |

