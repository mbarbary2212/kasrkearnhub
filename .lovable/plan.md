

## Plan: Add Light/Dark/System Theme Switching

### 1. Wrap app with ThemeProvider (`src/main.tsx`)
Import `ThemeProvider` from `next-themes` and wrap `<App />` inside the error boundaries:

```tsx
import { ThemeProvider } from 'next-themes';

// In render:
<ChunkLoadErrorBoundary>
  <GlobalErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </GlobalErrorBoundary>
</ChunkLoadErrorBoundary>
```

### 2. Create `src/components/ThemeToggle.tsx`
A dropdown button using `useTheme` from `next-themes` with three options: Light (Sun icon), Dark (Moon icon), System (Monitor icon). Uses existing shadcn `DropdownMenu` and `Button` components. Styled consistently with the existing icon buttons in the header (ghost variant, `h-8 w-8`).

### 3. Place toggle in header (`src/components/layout/MainLayout.tsx`)
Insert `<ThemeToggle />` inside the `<div className="flex items-center gap-2">` block (line 189), right before the admin notifications / avatar — so it's visible to all users (logged in or not). Add the import at the top.

### Files modified
- `src/main.tsx` — add ThemeProvider import + wrapper
- `src/components/ThemeToggle.tsx` — new file
- `src/components/layout/MainLayout.tsx` — import + place ThemeToggle

### Files NOT modified
- `sonner.tsx`, `index.css`, `tailwind.config.ts`, page/feature components

