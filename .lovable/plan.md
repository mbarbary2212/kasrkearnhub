

# Fullscreen Card Layout Improvements

## Changes (single file: `FlashcardClozeMode.tsx`)

### 1. Remove browser ESC bar
Cannot control the browser's native fullscreen ESC notification — that's browser-managed. However, we can suppress it by switching from native `requestFullscreen` to a CSS-only fullscreen overlay approach. Update `useFullscreen.ts` to always use the CSS overlay method (fixed positioning, z-index, full viewport) instead of the native Fullscreen API. This eliminates the browser's "press ESC to exit" bar entirely.

### 2. Enlarge card size in fullscreen for PC/tablet
- Change the card container max-width from `max-w-md` (28rem) to a responsive fullscreen size: `max-w-2xl` (42rem) on md+ screens when in fullscreen
- Increase `min-h-56` to `min-h-72` or `min-h-80` in fullscreen for both cloze and flip cards
- The topic selector should also widen to match

### 3. Move Extra section outside the card (cloze)
- The cloze card itself stays fixed-height (`min-h-72` in fullscreen, `min-h-56` normal) containing only the cloze text and reveal button
- The "Extra" section renders **below** the card as a separate container that can grow freely, not inside the card's border
- This keeps consistent card sizing while allowing variable-length extra content

### 4. Remove fixed bottom "Exit Fullscreen" button positioning issue
- The "Exit Fullscreen" button at the bottom (line 452-458) stays but the container should not use `justify-center` which pushes content to the middle — use `justify-start pt-8` instead so content flows naturally from top, allowing scrolling when extra text is long

## File changes

| File | Change |
|------|--------|
| `useFullscreen.ts` | Always use CSS overlay (fixed fullscreen) instead of native API to avoid browser ESC bar |
| `FlashcardClozeMode.tsx` | Enlarge card in fullscreen (`max-w-2xl`), move Extra outside card, use `overflow-y-auto` container instead of centered fixed layout |

