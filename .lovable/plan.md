

## Merge Module Nav into Global Sidebar

### Problem
The screenshot shows **two duplicate navigations**: the global left sidebar AND the module-level internal nav rail both show Dashboard, Learning, Connect, Formative Assessment, Study Coach. The user wants a single left sidebar that controls everything.

### Solution
Make the `StudentSidebar` context-aware. When the user is on a module page (`/module/:id`), the sidebar items control module sections (dashboard, learning, connect, formative, coach). When on other pages, they navigate globally. Remove the internal module nav rail entirely.

### Changes

**1. `src/components/layout/StudentSidebar.tsx`**
- Detect if current route is `/module/:moduleId` using `useLocation` + regex
- When on a module page: clicking Dashboard/Learning/Connect/Formative/Coach navigates to `/module/:moduleId?section=dashboard|learning|connect|formative|coach`
- When NOT on a module page: keep current global behavior (Dashboard → `/`, Learning → `/` with skipAutoLogin, Connect → `/connect`, Formative → `/formative`, Coach → `/progress`)
- Read `?section=` param from URL to determine active state when on a module page
- Change Dashboard icon from `Home` to `LayoutDashboard` (lucide)
- Highlight active item based on the current `section` param when on module pages

**2. `src/pages/ModulePage.tsx`**
- Remove the entire desktop vertical nav rail (lines 292-356, the `hidden md:block w-[200px]` div)
- Remove the vertical divider (line 359)
- Keep the mobile horizontal nav tabs (they're needed since the sidebar is `hidden md:flex`)
- Sync `activeSection` state with URL `?section=` param using `useSearchParams` (already partially done) — make it fully reactive so sidebar clicks update it
- Add a `useEffect` to watch `searchParams.get('section')` and update `activeSection` accordingly

**3. Active state logic in sidebar when on module page**
```text
URL: /module/abc?section=learning  →  "Learning" highlighted
URL: /module/abc?section=dashboard →  "Dashboard" highlighted
URL: /module/abc (no param)        →  "Dashboard" highlighted (default)
```

### What Does NOT Change
- Mobile module navigation (horizontal tabs stay)
- Sidebar collapse/expand behavior
- Settings pinned to bottom
- Admin/teacher views (they don't see StudentSidebar)
- Colors, fonts, design system
- Module content rendering logic

