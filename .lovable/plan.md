

## Fix: Excessive horizontal padding on mobile

**Root cause:** Two layers of padding stack on mobile:
1. Tailwind's `container` class applies `padding: 2rem` (32px per side) globally
2. The `<main>` element adds `px-4` (16px per side)

On a 390px screen this wastes ~96px, leaving only ~294px for content.

**Solution:** Reduce the container padding on small screens and remove the redundant `px-4` on the main element for students (who already get container padding via the inner div).

### Changes

**1. `tailwind.config.ts`** — Make container padding responsive:
```ts
container: {
  center: true,
  padding: {
    DEFAULT: "1rem",    // 16px on mobile (was 2rem/32px)
    md: "2rem",         // 32px on desktop (unchanged)
  },
  screens: {
    "2xl": "1400px",
  },
},
```

**2. `src/components/layout/MainLayout.tsx`** — Reduce main content horizontal padding on mobile:
- Change `px-4` to `px-2 md:px-4` on the `<main>` element
- Change header `px-4` to `px-3 md:px-4`

This gives mobile ~24px total horizontal padding instead of ~96px — a huge improvement in usable content width.

