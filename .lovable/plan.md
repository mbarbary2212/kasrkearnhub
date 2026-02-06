

# Plan: Reposition SEO Text to Left Side

## Problem
The subtitle ("Kasr Al-Ainy Learning & Mentorship Hub") and description paragraph are currently centered on the screen, covering the watercolor building image in the background.

## Solution
Move the SEO text content to the left side, positioned below the logo and title, creating a left-aligned content column that leaves the central image visible.

## Layout Changes

### Desktop/Tablet View
**Before:**
```
+--------------------------------------------------+
|  [Logo] KALM Hub                                 |
|                                                  |
|           [Centered subtitle]                    |
|           [Centered SEO paragraph]               |
|                                                  |
|  [Pillar animation]                              |
|                                                  |
|              [Login button]                      |
+--------------------------------------------------+
```

**After:**
```
+--------------------------------------------------+
|  [Logo] KALM Hub                                 |
|  Kasr Al-Ainy Learning & Mentorship Hub          |
|                                                  |
|  [SEO paragraph - left aligned]                  |
|                                                  |
|  [Pillar animation]              [Image visible] |
|                                                  |
|              [Login button]                      |
+--------------------------------------------------+
```

### Mobile View
Similar approach - left-aligned text below the logo/title area.

## Technical Changes

**File: `src/components/SplashScreen.tsx`**

1. **Remove centered content div** (lines 76-89 for desktop, lines 131-144 for mobile)

2. **Move subtitle and SEO paragraph into the logo/title container** with absolute positioning, or create a new left-aligned container below the logo

3. **New positioning for desktop:**
   - Position: `absolute top-24 left-12` (below the logo area)
   - Text alignment: `text-left`
   - Max width: `max-w-md` to prevent spanning too wide
   - Remove `mx-auto` centering

4. **New positioning for mobile:**
   - Position: `absolute top-16 left-4` (below the mobile logo)
   - Smaller text sizes maintained
   - Left-aligned text

5. **Adjust pillar animation position** if needed to avoid overlap (currently at `top-1/2 left-12`)

## Visual Styling
- Keep text shadow/outline for readability against varying backgrounds
- Maintain semi-transparent text colors (`text-white/90`, `text-white/70`)
- Add drop-shadow for better contrast
outline the fonts for better visalbilty 


