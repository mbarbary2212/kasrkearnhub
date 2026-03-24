

# Dynamic Module Grid Columns

## Idea
Instead of a fixed grid, the number of columns adapts to the module count for a balanced layout:

| Module Count | Mobile | Tablet/PC |
|---|---|---|
| 1-4 | 2 cols | 2 cols |
| 5-6 | 2 cols | 3 cols |
| 7+ | 2 cols | 4 cols |

This way, when you have 4 modules they appear in a nice 2×2 grid on desktop (all visible at once), and with 6 modules you get a balanced 3×2 grid. Mobile stays at 2 columns always.

## Implementation

**File: `src/pages/YearPage.tsx`**

- Compute grid class dynamically based on `modules.length`:
  - ≤4: `grid-cols-2` (same everywhere)
  - 5-6: `grid-cols-2 sm:grid-cols-3`
  - 7+: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Apply this to both the module cards grid and the skeleton loader grid
- No other changes needed

