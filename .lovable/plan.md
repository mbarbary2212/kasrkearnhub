
# Replace Mind Map Icon with "Explore App Structure" Pill Button and Rename to "App Architecture"

## What Changes

1. **Home Page** -- Replace the small network icon button next to "Academic Years" with a styled pill button labeled "Explore App Structure" using a Compass icon. Add hover effects (slight lift, stronger shadow) and a tooltip.

2. **Rename labels** throughout the UI from "App Mind Map" / "App Structure" to "App Architecture" (display labels only, no DB key changes).

3. **Subtle pulse glow** -- A very soft glow animation every ~12 seconds on the pill button.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Replace `Network` icon button with a styled pill `Button` using `Compass` icon + "Explore App Structure" label. Add tooltip wrapping. Add CSS classes for hover lift/glow. |
| `src/components/dashboard/AppMindMap.tsx` | Rename dialog title from "App Structure" to "App Architecture" and description to match. |
| `src/components/admin/HomeMindMapSettings.tsx` | Rename card title to "App Architecture", update description text, and rename version labels to "Student App Architecture" / "Admin App Architecture". |
| `src/index.css` | Add a `@keyframes soft-glow-pulse` animation (runs every 12s) for the pill button. |

## Technical Details

### Home.tsx -- Pill Button

Replace the ghost icon button (lines 226-233) with:

```typescript
import { Compass } from 'lucide-react';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        className="h-auto px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/15 shadow-sm
                   hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25
                   transition-all duration-300 ease-out
                   animate-[soft-glow-pulse_12s_ease-in-out_infinite] gap-2 text-sm font-medium"
        onClick={() => setMindMapOpen(true)}
      >
        <Compass className="h-4 w-4" />
        Explore App Structure
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>See how the platform is structured across years, modules, and chapters.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### index.css -- Glow Keyframes

```css
@keyframes soft-glow-pulse {
  0%, 90%, 100% { box-shadow: 0 0 0 0 transparent; }
  95% { box-shadow: 0 0 8px 2px hsl(var(--primary) / 0.15); }
}
```

### AppMindMap.tsx -- Title Rename

- "App Structure" -> "App Architecture"
- "Overview of KALM Hub features and navigation" -> "Overview of KALM Hub architecture and navigation"

### HomeMindMapSettings.tsx -- Admin Label Rename

- Card title: "Home Mind Map" -> "App Architecture"
- Card description updated
- Version labels: "Student" -> "Student App Architecture", "Admin" -> "Admin App Architecture"
- Toast messages updated accordingly
