

# Fix: Logo Invisible in Dark Mode and Smaller in Light Mode

## Problem

The logo `<img>` tag has two conflicting style rules:
- `style={{ mixBlendMode: 'multiply' }}` — always active, makes the logo invisible on dark backgrounds (multiply blends to black)
- `dark:brightness-0 dark:invert` — sets brightness to 0 (all black) then inverts (all white), but multiply blend mode cancels it out on a dark card background

The result: logo disappears in dark mode, and pressing it shows a white rectangle (the inverted image before blend mode hides it).

## Fix

**File**: `src/components/layout/MainLayout.tsx` (line 122)

1. Remove the inline `style={{ mixBlendMode: 'multiply' }}` — it cannot be conditionally toggled per theme
2. Add a CSS utility class in `src/index.css` that applies `mix-blend-mode: multiply` only in light mode:
   ```css
   .logo-blend-light {
     mix-blend-mode: multiply;
   }
   .dark .logo-blend-light {
     mix-blend-mode: normal;
   }
   ```
3. Update the `<img>` classes:
   - Light mode: `logo-blend-light` handles the blend, no filter needed
   - Dark mode: `dark:invert` only (no `dark:brightness-0`) + `mix-blend-mode: normal` so the inverted logo is fully visible on the dark card background

Final tag:
```tsx
<img src={logo} alt="KALM Hub Logo" 
  className="h-[72px] md:h-[80px] w-auto object-cover object-top logo-blend-light dark:invert" />
```

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Add `.logo-blend-light` / `.dark .logo-blend-light` utility |
| `src/components/layout/MainLayout.tsx` | Remove inline style, update classes |

