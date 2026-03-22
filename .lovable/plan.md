

# Give Module Admin Full Scoped Access to Inbox + Fix Multi-Module Announcements

## Summary
The module admin should have the same admin panel privileges as platform admin, but scoped to their assigned modules. Currently, Analytics and Announcements tabs are already accessible — the Inbox (Feedback & Inquiries) tab is not. There's also a bug where multi-module admins only see announcements from their first module.

## Changes

### 1. `src/components/admin/AdminTabsNavigation.tsx` — Show Inbox to module admins (line 67)
Change: `visible: isSuperAdmin || isPlatformAdmin` → `visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin`

### 2. `src/pages/AdminPage.tsx` — Two changes
**a) Duplicate visibility logic (line 1059):** Add `isModuleAdmin` to inbox visibility:
`{ value: 'inbox', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin }`

**b) TabsContent guard (line 2190):** Add `isModuleAdmin`:
`{(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (`

### 3. `src/components/admin/AdminInboxTab.tsx` — Add module admin filtering (line 60-78)
Add an `else if` branch for module admins (using `isModuleAdmin` + `moduleAdminModuleIds` from auth context) that scopes feedback/inquiry filters to their assigned module IDs, similar to the existing `isDepartmentAdmin` branch.

### 4. `src/hooks/useAnnouncements.ts` — Fix multi-module announcements
Replace `useModuleAnnouncements` (single module) usage in `AnnouncementsTab` with a new `useModuleAdminAnnouncements(moduleIds: string[])` hook that fetches announcements using `.in('module_id', moduleIds)` instead of `.eq('module_id', moduleId)`. This ensures module admins with multiple modules see all their announcements.

### 5. `src/components/admin/AnnouncementsTab.tsx` — Use new multi-module hook (line 69-71)
Replace the single-module `useModuleAnnouncements(moduleAdminModuleIds[0])` call with `useModuleAdminAnnouncements(moduleAdminModuleIds)`.

## Files Modified
| File | Change |
|------|--------|
| `src/components/admin/AdminTabsNavigation.tsx` | Add `isModuleAdmin` to inbox tab visibility |
| `src/pages/AdminPage.tsx` | Add `isModuleAdmin` to inbox visibility in duplicate logic + TabsContent guard |
| `src/components/admin/AdminInboxTab.tsx` | Add module admin branch to feedback/inquiry filters |
| `src/hooks/useAnnouncements.ts` | Add `useModuleAdminAnnouncements(moduleIds[])` hook |
| `src/components/admin/AnnouncementsTab.tsx` | Use new multi-module hook instead of single-module |

