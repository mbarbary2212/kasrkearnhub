

# Animated Pillar Overlay for Splash Screen

## Summary
Add a cycling animated text overlay that introduces the four core pillars of KALM Hub (Learn, Connect, Formative assessment, Personal coach) using a fade-up + blur-to-sharp animation. The background will use CSS background-image instead of `<img>` tags.

## The Four Pillars

| # | Title | Description |
|---|-------|-------------|
| 1 | Learn | Resources • Practice • Test yourself |
| 2 | Connect | Feedback • Questions • Discussion |
| 3 | Formative assessment | Track progress • Identify gaps |
| 4 | Personal coach | Guidance • Smart recommendations |

## Animation Timeline

```text
0ms ────── 600ms ────── 2600ms ────── 3200ms ────► next pillar
    Fade In    Hold/Read    Fade Out
    Blur→Sharp             Sharp→Blur
    ↑ Move up              ↓ Move down
```

- **Fade in**: 600ms
- **Hold (read time)**: 2000ms  
- **Fade out**: 600ms
- **Total per pillar**: 3200ms
- **Full loop (4 pillars)**: 12.8 seconds

## Key Changes

### 1. Background Image Approach
**Before**: Using `<img>` tags
**After**: Using CSS background-image classes

```tsx
// Desktop
className="bg-[url('/splash-landscape.jpeg')] bg-cover bg-center bg-no-repeat"

// Mobile  
className="bg-[url('/splash-portrait.jpeg')] bg-cover bg-center bg-no-repeat"
```

### 2. State & Animation Logic

```tsx
const [currentPillar, setCurrentPillar] = useState(0);
const [isVisible, setIsVisible] = useState(true);

// Stable scheduling pattern with single interval
useEffect(() => {
  const FADE_IN = 600;
  const HOLD = 2000;
  const FADE_OUT = 600;
  const CYCLE = FADE_IN + HOLD + FADE_OUT; // 3200ms

  const interval = setInterval(() => {
    // Start fade out
    setIsVisible(false);
    
    // After fade out completes, advance and fade in
    setTimeout(() => {
      setCurrentPillar((prev) => (prev + 1) % 4);
      setIsVisible(true);
    }, FADE_OUT);
  }, CYCLE);

  return () => clearInterval(interval);
}, []);
```

### 3. Pillar Overlay Component

```tsx
// Inline styles for smooth blur/opacity/transform transitions
style={{
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
  filter: isVisible ? 'blur(0px)' : 'blur(4px)',
  transition: 'opacity 600ms ease-out, transform 600ms ease-out, filter 600ms ease-out',
  willChange: 'opacity, transform, filter', // iOS Safari optimization
}}
```

## Visual Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │            [CSS Background Image - Static]            │  │
│  │                                                       │  │
│  │                                                       │  │
│  │              ╭─────────────────────────╮              │  │
│  │              │        Learn            │ ← Animated   │  │
│  │              │  Resources • Practice   │   overlay    │  │
│  │              │    • Test yourself      │              │  │
│  │              ╰─────────────────────────╯              │  │
│  │                                                       │  │
│  │              [ Click to log in ]        ← Existing    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
     Thin white frame (p-2 / p-3)
```

## Overlay Container Styling

| Property | Value |
|----------|-------|
| Background | `bg-black/40` |
| Blur | `backdrop-blur-md` |
| Border radius | `rounded-xl` |
| Padding | `px-6 py-4` |
| Max width | `max-w-[320px]` (mobile) / `max-w-md` (desktop) |
| Position | `absolute bottom-24` (above login button) |
| Text align | `text-center` |

## Typography

| Element | Desktop | Mobile |
|---------|---------|--------|
| Title | `text-2xl font-bold text-white` | `text-lg font-bold text-white` |
| Description | `text-base text-white/80` | `text-sm text-white/80` |

## File to Modify

| File | Changes |
|------|---------|
| `src/components/SplashScreen.tsx` | Replace `<img>` with CSS background, add state/effect for animation, add pillar overlay component |

## Component Structure

```tsx
import { useState, useEffect } from 'react';

const PILLARS = [
  { title: 'Learn', description: 'Resources • Practice • Test yourself' },
  { title: 'Connect', description: 'Feedback • Questions • Discussion' },
  { title: 'Formative assessment', description: 'Track progress • Identify gaps' },
  { title: 'Personal coach', description: 'Guidance • Smart recommendations' },
];

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [currentPillar, setCurrentPillar] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Animation cycle logic
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-white p-2 md:p-3 cursor-pointer animate-fade-in" onClick={onDismiss}>
      
      {/* Desktop: CSS background image */}
      <div className="hidden md:block relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-[url('/splash-landscape.jpeg')] bg-cover bg-center bg-no-repeat">
        
        {/* Pillar overlay */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2" style={{ /* animation styles */ }}>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-8 py-5 max-w-md text-center">
            <h2 className="text-2xl font-bold text-white">{PILLARS[currentPillar].title}</h2>
            <p className="text-base text-white/80 mt-1">{PILLARS[currentPillar].description}</p>
          </div>
        </div>

        {/* Login button - unchanged */}
        <button className="absolute bottom-8 left-1/2 -translate-x-1/2 ...">Click to log in</button>
      </div>

      {/* Mobile: CSS background image */}
      <div className="md:hidden relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-[url('/splash-portrait.jpeg')] bg-cover bg-center bg-no-repeat">
        
        {/* Pillar overlay (smaller) */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2" style={{ /* animation styles */ }}>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-6 py-4 max-w-[280px] text-center">
            <h2 className="text-lg font-bold text-white">{PILLARS[currentPillar].title}</h2>
            <p className="text-sm text-white/80 mt-1">{PILLARS[currentPillar].description}</p>
          </div>
        </div>

        {/* Login button - unchanged */}
        <button className="absolute bottom-6 left-1/2 -translate-x-1/2 ...">Click to log in</button>
      </div>
    </div>
  );
}
```

## iOS Safari Compatibility

- Use `will-change: opacity, transform, filter` for GPU acceleration
- Use `-webkit-backdrop-filter` (Tailwind handles this automatically)
- Inline transition styles ensure consistent behavior across browsers

## Result

A premium, calm, and professional splash screen that elegantly introduces users to the four core value propositions of KALM Hub with a smooth cycling animation before they log in.

