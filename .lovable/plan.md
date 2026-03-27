

## Fix: Show Ask Coach button on mobile above bottom nav

### Problem
The persistent Ask Coach floating button has `hidden sm:block`, making it invisible on mobile. The memory note says it should appear at `bottom-20` on mobile (above the 56px bottom nav).

### Change

**File: `src/components/layout/MainLayout.tsx` (lines 344-349)**

Replace the `hidden sm:block` wrapper with responsive positioning:
- Mobile: `bottom-20 right-3` (above the bottom nav bar + safe area)
- Desktop: `bottom-4 right-4`

```tsx
{user && !isAdmin && (
  <div className="fixed bottom-20 sm:bottom-4 right-3 sm:right-4 z-40 bg-card/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
    <AskCoachButton variant="header" />
  </div>
)}
```

Single line change — remove `hidden sm:block`, add responsive `bottom-20 sm:bottom-4`.

