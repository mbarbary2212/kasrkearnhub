## Add Persistent "Ask Coach" Footer Bar

### What

Add a fixed footer bar at the bottom of the main content area (for logged-in non-admin users) containing the "Ask Coach" button. It stays visible at all times as students navigate.  
move the "ask coach" from the main display to thee new location.   


### Changes

**File: `src/components/layout/MainLayout.tsx**`

1. Import `AskCoachButton` from `@/components/coach/AskCoachButton`
2. After the main content area and before the Mobile Bottom Nav, add a fixed-position footer bar:
  - `fixed bottom-0` (or `bottom-16` on mobile to sit above the mobile nav)
  - Right-aligned or centered, with glass styling matching the sidebar theme
  - Contains the `<AskCoachButton variant="header" />` 
  - Only rendered when `user && !isAdmin` (students and teachers)
3. Add bottom padding to `<main>` to prevent content from being hidden behind the footer (~`pb-16`on desktop,`pb-28` on mobile since mobile already has bottom nav)

### Footer Design

- Floating pill/bar: `fixed bottom-4 right-4` (desktop), `fixed bottom-20 right-4` (mobile, above bottom nav)
- Glass style: `bg-card/80 backdrop-blur-xl border border-white/10 rounded-full shadow-lg`
- Contains the Ask Coach button with the study-coach icon
- Subtle entrance animation

### Files

- `src/components/layout/MainLayout.tsx` — add footer with AskCoachButton