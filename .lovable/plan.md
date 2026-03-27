

## Redesign Student Sidebar: Icon-Under-Label + Floating Submenu Panel

### What We're Building

Replace the current expandable/collapsible sidebar with a **fixed-width icon+label sidebar** (icon on top, small label underneath, center-aligned) and a **floating glass submenu panel** that appears to the right when clicking items with sub-navigation. This applies to desktop (>=768px) and tablet (640-767px) only. Mobile bottom nav remains unchanged.

### Visual Layout

```text
┌──────────┐
│   icon   │
│Dashboard │  ← direct nav, no submenu
├──────────┤
│   icon   │        ┌──────────────────────┐
│ Learning │ ──────►│ ● Resources          │
├──────────┤        │ ● Interactive        │
│   icon   │        │ ● Practice           │
│ Connect  │        │ ● Test Yourself      │
├──────────┤        └──────────────────────┘
│   icon   │           floating panel
│Formative │           (glass, rounded,
├──────────┤            200ms animate)
│   icon   │
│  Coach   │
│          │
│  ─────   │
│   icon   │
│Customize │
│   icon   │
│ Settings │
└──────────┘
  ~80px wide
```

### Submenu Definitions

| Parent | Sub-items | Behavior |
|---|---|---|
| Dashboard | None | Direct navigate to `/` |
| Learning | Resources, Interactive, Practice, Test Yourself | **Enabled** only when on chapter/topic page. When not on a chapter page: items shown with reduced opacity + lock icon + tooltip "Choose a chapter first". Clicking disabled items is prevented. |
| Connect | Messages, Ask a Question, Feedback, Open Discussions, Study Groups | Direct navigate to `/connect` with `?view=` param or trigger existing modals/state |
| Formative | Written, Practical | Direct navigate to `/formative` with `?type=` param |
| Study Coach | Overview, Study Plan, Unlocks | Direct navigate to `/progress` with `?tab=` param |
| Customize Content | None | Direct navigate to `/customize-content` |
| Settings | None | Direct navigate to `/student-settings` |

### Disabled States for Learning Sub-items
When the student is NOT on a chapter/topic page, Learning sub-items appear with:
- `opacity-50` and `cursor-not-allowed`
- A small `Lock` icon next to the label
- Tooltip: "Choose a chapter first"
- Click handler is blocked

When the student IS on a chapter page, they work as they do today (update `?section=` param).

### Implementation Details

**File: `src/components/layout/StudentSidebar.tsx`** — Complete rewrite

1. **Primary sidebar**: Fixed `w-20` (80px) on desktop, `w-[88px]` on tablet. Always visible. No collapse toggle. Each item is a vertical flex column: icon (h-5 w-5) + label (text-[10px], centered, 2-line truncate for long labels like "Formative Assess.").

2. **Active state**: Subtle `bg-white/10` background + `text-foreground` + left 3px accent bar.

3. **Submenu panel state**: `activeSubmenu: string | null` in component state. Clicking a nav item with children sets it; clicking again or clicking outside closes it.

4. **Floating submenu panel**: Rendered as a `position: absolute` panel to the right of the sidebar (`left: 100%`, `top` aligned to the clicked item). Styled with `bg-card/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl`. Animated with `animate-in fade-in slide-in-from-left-2 duration-200`.

5. **Click-outside dismissal**: `useEffect` with document click listener when submenu is open.

6. **Submenu items**: Icon + title, vertical list with `py-2.5 px-4` spacing. Active item highlighted with the existing color-coding system (blue for Resources, teal for Interactive, etc.).

7. **Tablet (640-767px)**: Same layout, slightly wider (`w-[88px]`), same floating panel behavior. Replaces the current overlay slide-in approach.

8. **No collapse/expand toggle** — the sidebar is always the same width.

**File: `src/components/layout/MainLayout.tsx`** — Minor width adjustment
- Update the sidebar width reference from dynamic `w-14`/`w-52` to fixed `w-20`/`w-[88px]`.

**File: `src/pages/ConnectPage.tsx`** — Add `?view=` query param support
- Read `searchParams.get('view')` on mount to auto-open the relevant section (messages, inquiry, feedback, discussion, study-groups).

**File: `src/pages/FormativePage.tsx`** — Add `?type=` query param support  
- Read `searchParams.get('type')` to pre-filter between written/practical (this is a structural placeholder since the page currently shows module selection; the param will be used when relevant).

**File: `src/components/dashboard/StudentDashboard.tsx`** — Add `?tab=` query param support
- Read `searchParams.get('tab')` to set the default tab in `LearningHubTabs` (overview, study-plan, unlocks).

### What Does NOT Change
- Mobile bottom nav (unchanged)
- Content pages (no redesign)
- Page-level tabs/filters/dropdowns inside pages
- Header breadcrumb system
- Dark glassmorphism theme (preserved and extended to submenu panel)

### Files Changed
1. `src/components/layout/StudentSidebar.tsx` — Full rewrite
2. `src/components/layout/MainLayout.tsx` — Sidebar width adjustment
3. `src/pages/ConnectPage.tsx` — Query param routing for sub-views
4. `src/pages/FormativePage.tsx` — Query param for type filter
5. `src/components/dashboard/StudentDashboard.tsx` — Query param for default tab

