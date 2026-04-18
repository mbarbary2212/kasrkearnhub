
## Plan: Unblock Admin Panel Load

### Root cause
`useAdminData()` runs `profiles.select('*')` for every user and `AdminPage` blocks the entire page on it. Inbox loads fast because it bypasses this hook.

### Changes (4 files)

**1. `src/pages/AdminPage.tsx`**
- Loading gate (line ~91): block only on `authLoading`, not `adminDataLoading`.
- Swap `useAdminData` → `useAdminReferenceData` so tabs render as soon as years/modules/departments arrive (small reference tables).
- Keep `years` and `modules` props passed to child tabs unchanged.

**2. `src/hooks/useAdminData.ts`** — split into two hooks:

```text
useAdminReferenceData(enabled)
  → years + modules + departments
  → cheap, used by AdminPage to render tabs

useAdminUsers(enabled)
  → profiles (slim cols) + user_roles + department_admins + module_admins
  → only fires when UsersTab mounts
  → profiles select limited to:
     id, email, full_name, avatar_url, status, status_reason, created_at

useAdminData(enabled)  [kept for backward compat]
  → internally combines both, merges into existing { users, departments, years, modules } shape
```

Both hooks: `staleTime: 5 min`, query keys `['admin-reference-data']` and `['admin-users']` so cache invalidations stay surgical. Existing `['admin-data']` consumers still work via the combined hook.

**3. `src/components/admin/UsersTab.tsx`**
- Switch from `useAdminData` → `useAdminUsers`. Mounting the tab is what triggers the fetch (TanStack `enabled: true`).
- Show local spinner while `isLoading`.
- **Directory sub-tab** (~line 350-361): apply the same cap pattern the Students tab already uses — `Showing X of Y`, `.slice(0, 50)`, and "Refine your search to see more" hint when filtered > 50.
- **Deactivated sub-tab**: same cap treatment.
- Students/Platform Admins/Module Admins sub-tabs: leave as-is (Students already capped; others are naturally small).

**4. Verify column usage**
Before narrowing the profiles select, grep for fields read off profile rows (e.g. `profile.preferred_year_id`, `profile.banned_at`, `profile.year_id`) in admin components to make sure the slim list `id, email, full_name, avatar_url, status, status_reason, created_at` covers them. If anything else is read, add only that column — never restore `*`.

### Files touched
- `src/hooks/useAdminData.ts` — split + slim select
- `src/pages/AdminPage.tsx` — unblock gate + use reference hook
- `src/components/admin/UsersTab.tsx` — use users hook + cap Directory & Deactivated

### Not touched
Auth, RLS, env vars, edge functions, routing, notification shortcut to `/admin/inbox`, TopicAdminsTab, assignment dialogs, mutation invalidations (still target `['admin-data']` which the combined hook covers; we'll also invalidate `['admin-users']` where mutations specifically affect users).

### Acceptance check (manual after build)
1. `/admin` from sidebar → tabs visible <1s.
2. Click Inbox/Settings/Announcements → no users fetch.
3. Click Users → local spinner → list capped at 50 with hint.
4. Notification → `/admin/inbox` still loads fast.
