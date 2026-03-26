

## Problem

Between 640px and 767px (small tablets), both the collapsed sidebar strip AND the bottom navigation bar appear simultaneously, creating a cluttered UI.

## Solution

Three-tier responsive behavior:

```text
< 640px (mobile)     : Bottom nav only, no sidebar
640-767px (sm tablet): Floating chevron only → opens sidebar as slide-over overlay
>= 768px (desktop)   : Normal sidebar (collapsible)
```

### Changes

**1. `src/components/layout/StudentSidebar.tsx`**

Restructure into two rendering modes:

- **Desktop mode (md+ / >= 768px)**: Current sticky sidebar, unchanged. Use `hidden md:flex` instead of `hidden sm:flex`.
- **Small tablet mode (sm to md / 640-767px)**: Render a floating chevron button (fixed position, left edge, vertically centered). When clicked, the full sidebar slides in as a fixed overlay (with a semi-transparent backdrop). Clicking the chevron again or the backdrop closes it.

Implementation:
- Add `useIsMobile`-style hook check or inline media query state for the `sm-but-not-md` range (640-767px)
- When in that range: render a fixed `ChevronRight` button (e.g. `fixed left-0 top-1/2 -translate-y-1/2 z-40`) + conditionally render the sidebar as a fixed overlay (`fixed inset-y-0 left-0 z-50 w-52`) with backdrop
- The sidebar overlay reuses the existing nav content (no duplication)

**2. `src/components/layout/MobileBottomNav.tsx`**

Change bottom nav visibility from `md:hidden` to `sm:hidden` so it only appears below 640px (phones only), removing it from the small tablet range.

- Line 126: overlay `md:hidden` → `sm:hidden`
- Line 154: nav `md:hidden` → `sm:hidden`

### Behavior Summary

| Viewport | Sidebar | Bottom Nav | Chevron Trigger |
|----------|---------|------------|-----------------|
| < 640px  | Hidden  | Visible    | No              |
| 640-767  | Hidden (slides in on demand) | Hidden | Floating left-edge button |
| >= 768   | Sticky (collapsible) | Hidden | Built into sidebar |

