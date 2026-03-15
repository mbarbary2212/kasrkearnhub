

# Make Interactive Mode Default & Reorder Buttons

Two small changes:

## 1. Change default mode
**File: `src/hooks/useFlashcardSettings.ts` (line 16)**
Change `mode: 'slideshow'` → `mode: 'interactive'`

## 2. Swap button order
**File: `src/components/study/FlashcardsTab.tsx` (lines 224-241)**
Move the Interactive Mode button before the Slideshow Mode button so Interactive appears on the left.

