

## Frosted Glass Year Cards on Home Page

### Overview
Apply a glassmorphism effect to the Year cards on the Home page (`src/pages/Home.tsx`), with a dark blue-grey page background gradient, per-year colored glows, and scale-up hover.

### Changes

**1. `src/pages/Home.tsx` — Page background**
- Wrap the `LoggedInHome` content area (or the outer div) with a dark blue-grey gradient background: `bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900` applied via a full-bleed div behind the content. This sits inside `MainLayout`, so we add it as a wrapper div with `min-h-screen` styling and rounded corners or negative margins as needed.

**2. `src/pages/Home.tsx` — YearCard component**
- Replace `bg-card` with frosted glass: `bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-white/10`
- Remove `shadow-md`, replace with a soft colored glow using `style={{ boxShadow }}` keyed to year number:
  - Year 1: Blue `0 0 30px rgba(59,130,246,0.15)`
  - Year 2: Green `0 0 30px rgba(34,197,94,0.15)`
  - Year 3: Yellow `0 0 30px rgba(234,179,8,0.15)`
  - Year 4: Orange `0 0 30px rgba(249,115,22,0.15)`
  - Year 5: Red `0 0 30px rgba(239,68,68,0.15)`
- Hover: increase glow intensity to `0.35` and add `hover:scale-[1.03]` (replacing `hover:-translate-y-1`)
- Keep the colored left accent border

**3. Light mode consideration**
- In light mode, use `bg-white/60` instead of `bg-white/5` and slightly different gradient background (`from-slate-100 via-blue-50 to-indigo-100`) so it still looks good

### Technical details
- Year-to-glow color map defined as a simple object inside `LoggedInHome`
- `transition-all duration-300` already present, just swap classes
- No new files or dependencies needed

