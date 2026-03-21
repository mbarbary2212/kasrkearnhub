

# Fix: Cloze Card Flipping to "Question" + Fade-In Reveal

## Root Cause

**The bug is a classic JavaScript global regex pitfall.** Line 34 defines:
```
const CLOZE_REGEX = /\{\{c\d+::(.+?)\}\}/g;
```

The `g` (global) flag causes `.test()` to maintain internal state (`lastIndex`). Each call to `isClozeCard` advances the cursor, so on alternating renders it returns `true` then `false`. When the student clicks "Reveal Answer", the component re-renders, `isClozeCard` returns `false` this time, and the card switches to the non-cloze "Question" flip card view. Clicking again re-renders, `isClozeCard` returns `true` again, showing the cloze card with the answer revealed.

## Changes (single file: `FlashcardClozeMode.tsx`)

### 1. Fix the regex bug
Remove the `g` flag from `CLOZE_REGEX` (line 34) since it's only used for `.test()` in `isClozeCard`. The `renderClozeText` function already creates its own local regex, so it's unaffected.

### 2. Replace flip/swivel with fade-in for cloze reveal
Currently the cloze card just swaps content inline. The "swivel" feel comes from the transition overlay (lines 343-344) which briefly blanks the card during navigation. For the actual cloze reveal (blanks to answers + extra), change it to a smooth fade-in:
- Wrap the revealed answer pills and the Extra section in a CSS transition (`opacity 0→1, transform translateY(4px)→0`) using Tailwind's `animate-fade-in` class
- The `[...]` pills smoothly transition to the green answer pills
- The Extra section fades in below

### 3. Remove transition overlay interference on reveal
The transition overlay (line 344) should only activate during card navigation (prev/next), not during reveal. Currently `transitioning` is only set in `handlePrev`/`handleNext` so this is already correct, but we should verify the card doesn't get the `invisible` class applied to cloze cards (it's only on the non-cloze flip div, so this is fine).

## File Modified

| File | Change |
|------|--------|
| `src/components/study/FlashcardClozeMode.tsx` | Remove `g` flag from `CLOZE_REGEX`; add fade-in animation to revealed cloze answers and Extra section |

