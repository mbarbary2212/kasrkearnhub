

## Mobile Optimization Plan

The app currently has no persistent mobile navigation — the sidebar is desktop-only (`hidden md:flex`), and there's no bottom tab bar. On mobile, students rely on the avatar dropdown menu and per-page inline tab bars. This creates a fragmented, non-intuitive mobile experience.

### Key Problems

1. **No global mobile navigation** — Students can't quickly switch between Dashboard, Learning, Connect, Formative, or Study Coach on mobile without going through the avatar menu
2. **Header is cluttered on small screens** — Online pill, theme toggle, avatar all compete for 390px width
3. **Dashboard right column stacks below** — Stats, flashcards, study plan all push below the fold on mobile, making the page very long
4. **Module page inline tabs** — Already decent but could be improved with better touch targets
5. **No swipe gestures** — `useSwipeGesture` hook exists but isn't used on key pages
6. **Excessive vertical padding** — `py-8 pb-24` on main content wastes mobile space

### Plan

#### 1. Add a sticky bottom navigation bar for mobile students
- Create `src/components/layout/MobileBottomNav.tsx`
- 5 tabs: Dashboard, Learning, Connect, Formative, Coach (same as sidebar)
- Fixed to bottom, visible only on mobile (`md:hidden`), only for logged-in students
- Render it in `MainLayout.tsx` alongside the sidebar
- Include badge counts (unread messages on Connect, due flashcards indicator)
- Safe area padding for notched phones (`pb-safe`)

#### 2. Optimize header for mobile
- Hide the Online pill on very small screens (`hidden sm:flex`) — it's nice-to-have, not critical
- Reduce header height on mobile (h-14 vs h-16)
- Tighten gaps between header items

#### 3. Optimize Home dashboard for mobile
- On mobile, show stat cards (streak, readiness) as a compact horizontal strip instead of a separate column
- Reorder: greeting → stats strip → resume card → modules → study plan (prioritize action items)
- Make module cards single-column on very small screens (< 375px)

#### 4. Tighten mobile spacing in MainLayout
- Reduce `py-8` to `py-4` on mobile: `py-4 md:py-8`
- Reduce `pb-24` to account for bottom nav height: `pb-20 md:pb-8`

#### 5. Add swipe navigation on Module/Chapter pages
- Wire `useSwipeGesture` on ModulePage to swipe between section tabs (Learning ↔ Connect ↔ Formative ↔ Coach)
- Provides a native-feeling navigation pattern

#### 6. Improve touch targets
- Ensure all interactive elements on mobile have minimum 44px touch targets
- Module cards, nav tabs, buttons — audit and fix any undersized targets

### Files to create/edit
- **New**: `src/components/layout/MobileBottomNav.tsx`
- **Edit**: `src/components/layout/MainLayout.tsx` (render bottom nav, tighten mobile header/spacing)
- **Edit**: `src/pages/Home.tsx` (mobile-first layout reorder)
- **Edit**: `src/pages/ModulePage.tsx` (swipe gestures, touch targets)

### Technical notes
- Bottom nav uses same route logic as `StudentSidebar` for consistency
- `useIsMobile()` hook already exists for conditional rendering
- `useSwipeGesture` hook is ready to use
- Bottom nav z-index should be 40+ to stay above content

