
# Rebrand to KALM Hub + Responsive Splash + 5 Pillars Layout

## Overview

This plan implements frontend-only UI changes to rebrand the app from "KasrLearn" to "KALM Hub", add a responsive full-screen splash overlay on initial load only, and improve the 5 pillars layout on mobile by centering the 5th item.

**Scope**: UI text, images, and layout/styling only. No backend, auth, routing, database, or localStorage/state changes.

---

## Additional Constraints (User Clarification)

1. **Splash display rule**: Show only on initial load/refresh, NOT on internal navigation
   - Implementation: Use `sessionStorage` flag that persists during the session but clears on refresh
   
2. **Navbar logo constraint**: Keep logo height consistent
   - Desktop: max ~40px height
   - Mobile: max ~32px height

---

## Assets to Add

| Source Upload | Destination | Purpose |
|--------------|-------------|---------|
| White-background logo (JPEG) | `src/assets/kalm-hub-logo.jpeg` | Header + landing page logo |
| Landscape splash image (JPEG) | `public/splash-landscape.jpeg` | Desktop/tablet splash (>=768px) |
| Portrait splash image (JPEG) | `public/splash-portrait.jpeg` | Mobile splash (<768px) |

---

## Implementation Details

### Phase 1: Add Splash Screen Component

**New File: `src/components/SplashScreen.tsx`**

Creates a full-screen overlay that:
- Uses `<picture>` element with responsive `<source>` for image selection
- Portrait image for `max-width: 767px`
- Landscape image for `min-width: 768px`  
- Shows for approximately 1.5 seconds
- Fades out smoothly with 500ms CSS opacity transition
- Covers the entire viewport with `fixed inset-0 z-[9999]`
- Only loads ONE image per device size (browser handles this with picture/source)

```text
Splash Screen Flow:
┌────────────────────────────────────┐
│  App mounts                        │
│           ↓                        │
│  Check sessionStorage flag         │
│  "splash_shown_this_session"       │
│           ↓                        │
│  If flag exists → skip splash      │
│  If no flag → show splash          │
│           ↓                        │
│  Set flag in sessionStorage        │
│           ↓                        │
│  After 1.5s → isFading = true      │
│           ↓                        │
│  Apply opacity-0 transition (0.5s) │
│           ↓                        │
│  After fade → showSplash = false   │
│  (component unmounts)              │
└────────────────────────────────────┘
```

### Phase 2: Integrate Splash into App

**File: `src/App.tsx`**

Changes:
- Import new `SplashScreen` component
- Add `useState` for `showSplash` and `isFading`
- Add `useEffect` that:
  - Checks `sessionStorage.getItem('splash_shown_this_session')`
  - If already shown this session → skip splash entirely
  - If not shown → display splash, set flag, then fade after 1500ms
- Render `<SplashScreen>` conditionally above all other content

### Phase 3: Rebrand Visible Text Only

**Files to update with "KALM Hub" instead of "KasrLearn":**

| File | Changes |
|------|---------|
| `index.html` | Title, og:title, meta description, meta author, twitter:site |
| `src/pages/Home.tsx` | H1 heading, alt text, meta description text |
| `src/pages/Auth.tsx` | All logo alt texts (6 instances), "Sign in to access" text |
| `src/components/layout/MainLayout.tsx` | Brand text in header, logo alt text |
| `src/components/ChunkLoadErrorBoundary.tsx` | "new version of KALM Hub" error text |
| `src/pages/FeedbackPage.tsx` | "improve KALM Hub" description text |
| `src/components/feedback/FeedbackModal.tsx` | Email subject line "KALM Hub Feedback" |
| `src/components/feedback/InquiryModal.tsx` | Email subject line "KALM Hub Question" |

### Phase 4: Replace Logo Images

**Files to update:**

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Import new `kalm-hub-logo.jpeg` instead of `logo.png` |
| `src/pages/Auth.tsx` | Import new `kalm-hub-logo.jpeg` instead of `logo.png` |
| `src/components/layout/MainLayout.tsx` | Import new `kalm-hub-logo.jpeg`, add height constraints |

**Navbar logo sizing (MainLayout.tsx):**
```jsx
<img 
  src={logo} 
  alt="KALM Hub Logo" 
  className="h-8 md:h-10 w-auto object-contain" 
/>
```
- `h-8` = 32px on mobile
- `md:h-10` = 40px on desktop
- `w-auto` preserves aspect ratio

### Phase 5: 5 Pillars Layout Enhancement

**File: `src/pages/Home.tsx`**

Current layout: All 5 pillars in `grid-cols-2 md:grid-cols-5`

New layout:
- Desktop/tablet (md+): Keep existing 5-column single row
- Mobile: First 4 pillars in 2x2 grid, 5th pillar (Personal Study Coach) in a separate centered row with the same width as other cards

```text
Mobile Layout (New):
┌──────────────────────────────┐
│  Resources  │   Practice     │
├──────────────────────────────┤
│  Formative  │   Connect      │
├──────────────────────────────┤
│     [ Study Coach ]          │ ← Centered, same width
└──────────────────────────────┘

Desktop Layout (Unchanged):
┌──────────────────────────────────────────────────────────┐
│ Resources │ Practice │ Formative │ Connect │ Study Coach │
└──────────────────────────────────────────────────────────┘
```

Implementation:
1. Define pillars array with all 5 items
2. On mobile view: render first 4 in grid, then 5th in flex justify-center with width matching grid columns
3. On desktop: show all 5 in single row

---

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `src/assets/kalm-hub-logo.jpeg` | New | KALM Hub logo asset |
| `public/splash-landscape.jpeg` | New | Landscape splash image |
| `public/splash-portrait.jpeg` | New | Portrait splash image |
| `src/components/SplashScreen.tsx` | New | Splash overlay component |
| `src/App.tsx` | Edit | Import + render SplashScreen with session-aware state |
| `index.html` | Edit | Update title and meta tags |
| `src/pages/Home.tsx` | Edit | Logo, text, 5 pillars layout |
| `src/pages/Auth.tsx` | Edit | Logo and text changes |
| `src/components/layout/MainLayout.tsx` | Edit | Logo with height constraints, brand text |
| `src/components/ChunkLoadErrorBoundary.tsx` | Edit | Text update |
| `src/pages/FeedbackPage.tsx` | Edit | Text update |
| `src/components/feedback/FeedbackModal.tsx` | Edit | Email subject text |
| `src/components/feedback/InquiryModal.tsx` | Edit | Email subject text |

**NOT modified** (explicitly excluded):
- `src/lib/stabilityGuards.ts` - no localStorage changes
- `src/components/dashboard/StudentDashboard.tsx` - no localStorage changes
- Any backend/auth/routing logic

---

## Technical Notes

1. **Responsive Images**: Using `<picture>` with `<source media="...">` ensures only the appropriate image is downloaded based on viewport width
2. **Splash Timing**: 1.5s display + 0.5s fade = 2s total - feels snappy without being jarring
3. **Session-only splash**: Using `sessionStorage` ensures splash shows on page refresh but not on internal navigation
4. **Z-index**: Splash uses `z-[9999]` to appear above all other content including modals
5. **Logo height consistency**: Using Tailwind classes `h-8 md:h-10 w-auto` for 32px/40px responsive sizing
6. **No State/Storage Changes**: All localStorage keys and app state logic remain unchanged

---

## Verification Checklist

After implementation:
- [ ] Splash appears on initial page load with correct image per device
- [ ] Splash does NOT appear on internal navigation (e.g., click Home then back)
- [ ] Splash fades out smoothly after ~2 seconds
- [ ] "KALM Hub" appears in browser tab
- [ ] New logo appears in header (~32px mobile, ~40px desktop)
- [ ] New logo appears on landing page
- [ ] New logo appears on auth page
- [ ] 5 pillars: first 4 in 2x2 grid on mobile, 5th centered below
- [ ] 5 pillars: all 5 in single row on desktop
- [ ] All visible "KasrLearn" text replaced with "KALM Hub"
- [ ] App functionality unchanged (login, navigation, data persistence all work)
