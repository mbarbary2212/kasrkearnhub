

## Plan: Sidebar Spacing Fix + Discussions & Study Groups as Pages

### Part 1 — Tighten sidebar bottom items spacing

The Customize and Settings items sit below a separator with `my-0.5` margin and `pb-2` padding. The nav items themselves have `py-3` vertical padding, making them tall.

**Fix in `StudentSidebar.tsx`:**
- Remove the separator `div` entirely (the `mx-4 my-0.5 border-t` element)
- Reduce the bottom section's padding to `pb-1`
- This will pull Customize/Settings snug against Coach

### Part 2 — Convert Discussions & Study Groups to dedicated pages

**A. Create two new page components:**

| File | Content |
|------|---------|
| `src/pages/DiscussionsPage.tsx` | Wraps `DiscussionSection` in `MainLayout` with a "← Back" link to previous page |
| `src/pages/StudyGroupsPage.tsx` | Wraps `StudyGroupList` + `GroupDetailView` in `MainLayout` with internal navigation state for group detail |

Both pages use the existing components — no new UI to build.

**B. Add routes in `App.tsx`:**
- `/connect/discussions` → `DiscussionsPage` (lazy loaded, protected)
- `/connect/groups` → `StudyGroupsPage` (lazy loaded, protected)

**C. Update sidebar submenu click handler (`StudentSidebar.tsx`):**

In `handleSubClick`, when `parentId === 'connect'`:
- If `sub.id === 'discussions'` → `navigate('/connect/discussions')`
- If `sub.id === 'study-groups'` → `navigate('/connect/groups')`
- Otherwise (messages, inquiry, feedback) → `openConnect(sub.id)` as before

**D. Update sidebar active state (`isItemActive`):**

For `connect` item, return `true` when pathname starts with `/connect/`.

**E. Update `ConnectModal.tsx`:**

Remove the `discussions` and `study-groups` branches from the overlay — they will no longer be opened via `openConnect()`. Remove unused imports (`DiscussionSection`, `StudyGroupList`, `GroupDetailView`) and the `selectedGroupId` state. Remove entries from `viewTitles`. The body-scroll-lock logic simplifies since only `messages` uses the overlay panel.

**F. Update `ConnectContext.tsx`:**

Remove `'discussions'` and `'study-groups'` from the `ConnectView` type since they're no longer overlay views.

### Files to edit

1. `src/components/layout/StudentSidebar.tsx` — spacing fix + submenu click routing + active state
2. `src/pages/DiscussionsPage.tsx` — new file
3. `src/pages/StudyGroupsPage.tsx` — new file
4. `src/App.tsx` — add two routes
5. `src/components/connect/ConnectModal.tsx` — remove discussions/groups branches
6. `src/contexts/ConnectContext.tsx` — narrow ConnectView type

