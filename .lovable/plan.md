

# Redesign Student Module Page Sidebar -- Visual Hierarchy Enhancement

## Overview

Enhance the desktop sidebar and mobile tabs with a hierarchical visual system using per-section color accents, a glass-effect background, a 4px active indicator bar, and subtle hover animations. No changes to routing, content, or admin views.

## Desktop Sidebar Changes

### Container (`nav` wrapper)

- Replace `bg-card rounded-xl border border-border shadow-sm` with a glass-effect gradient:
  - `bg-gradient-to-b from-blue-50/80 to-white/60`
  - `backdrop-blur-md`
  - `border border-white/40`
  - `shadow-sm rounded-xl`

### Vertical Divider (line 211)

- Replace the hard `w-px bg-border/50` divider with a soft shadow edge:
  - `w-px bg-transparent shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]`

### Per-Section Color Map

Each section gets a unique accent applied to the active indicator bar, icon color, and active background:

| Section | Accent Color | Active BG | Icon Class |
|---------|-------------|-----------|------------|
| Learning | `bg-blue-600` | `bg-blue-50` | `text-blue-600` |
| Connect | `bg-teal-500` | `bg-teal-50` | `text-teal-500` |
| Formative | `bg-violet-500` | `bg-violet-50` | `text-violet-500` |
| Coach | `bg-amber-500` | `bg-amber-50` | `text-amber-500` |

### Button Styling

- **Active state**: Remove the current `bg-primary text-primary-foreground`. Replace with:
  - Section-specific light background (e.g., `bg-blue-50`)
  - 4px left border indicator (`border-l-4 border-l-blue-600`)
  - Section-colored text (`text-blue-700`)
  - `font-semibold`
- **Inactive state**: 
  - `text-muted-foreground`
  - Icon at `opacity-70`
  - Hover: `hover:bg-gray-50/80 hover:translate-y-[-1px]` with `transition-all duration-150`

### Icons

- Active: full color per section
- Inactive: `opacity-70` applied via class

## Mobile Tabs

- Apply matching section colors to the active mobile tab background (e.g., `bg-blue-100 text-blue-700` for Learning)
- Keep the same glass-effect container styling as desktop

## Dark Mode Compatibility

- Use `/80` and `/60` opacity suffixes so the gradient fades gracefully in dark mode
- Active backgrounds use dark-safe variants: `dark:bg-blue-950/30`, etc.

## File Modified

**`src/pages/ModulePage.tsx`** only -- approximately 30 lines changed across the nav container, button classNames, icon classNames, and divider. A small `sectionColors` lookup map (6 lines) will be added near the `sectionNav` definition.

## What Stays Unchanged

- All routing and `setActiveSection` logic
- `sectionNav` array structure
- Admin/teacher sidebar path
- Connect badge rendering
- Content area and all child components
- Mobile layout structure (only colors change)

