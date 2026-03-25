
Goal: fix the stale year-selection bug so choosing a year on `/years` immediately updates Home (without manual refresh).

1) Root-cause fix (single source of truth for profile state)
- Problem: `AllYearsPage` updates `profiles.preferred_year_id`, but Home reads `profile` from `useAuth` local state, which is not refreshed by `queryClient.invalidateQueries(['profile'])` (that query key does not exist).
- Action: extend `useAuth` with profile sync helpers:
  - `patchProfile(updates)` (optimistic local merge into `state.profile`)
  - `refreshProfile()` (re-fetch profile via existing `fetchUserData(user.id)`)

2) Update year-pick flow in `AllYearsPage.tsx`
- Replace current “invalidate profile query” logic with:
  - perform `profiles` update
  - handle Supabase error explicitly (do not navigate on failure)
  - on success call `patchProfile({ preferred_year_id: yearId })`
  - optionally trigger `refreshProfile()` in background
  - navigate to `/`
- Remove unused `queryClient.invalidateQueries({ queryKey: ['profile'] })`.

3) Harden Home year initialization in `Home.tsx`
- Keep profile-driven behavior, but make it deterministic:
  - if `preferred_year_id` exists and matches active years -> set `selectedYearId`
  - else fallback to first active year
- Prevent invalid stale ID edge cases (e.g., deactivated year).

4) Apply same pattern to other profile updates (consistency)
- In `AccountPage.tsx`, after profile/avatar updates, call `patchProfile(...)` so header/user info updates instantly across routes (prevents same “needs refresh” class of bugs).

5) Verification checklist (end-to-end)
- From Home, open `/years`, pick Year 1/2/3/4/5 repeatedly:
  - Home must immediately show selected year context and correct modules.
  - No page refresh required.
- Return to `/years`:
  - “current year” highlight matches last selection.
- Refresh browser once:
  - selected year remains correct (server persisted + local state in sync).

Technical details
- Files to update:
  - `src/hooks/useAuth.ts` (add `patchProfile`, `refreshProfile` to returned auth API)
  - `src/pages/AllYearsPage.tsx` (use auth sync methods, remove invalid React Query invalidation)
  - `src/pages/Home.tsx` (robust selected-year sync/fallback)
  - `src/pages/AccountPage.tsx` (reuse `patchProfile` after save/upload)
- This fixes the current bug at its source instead of patching around navigation timing.
