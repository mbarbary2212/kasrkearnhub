

# Make Module Cards Smaller (Fit 4 Visible on Screen)

## What
Keep the current dynamic column logic unchanged. Add a `max-w` constraint to the grid container so cards don't stretch too wide on PC/tablet, ensuring a 2×2 block of 4 cards is fully visible without scrolling.

## How

**File: `src/pages/YearPage.tsx`**

- Wrap the cards grid `<div>` with a max-width so on wide screens the cards stay compact: `max-w-2xl` (~672px). This keeps 2-col cards small enough that 4 fit in the viewport vertically.
- Alternatively (and more reliably), constrain card height by switching the AspectRatio from `16/9` to a tighter ratio like `2.5/1` or `3/1`, which shrinks each card's image area and ensures 4 cards fit vertically.

**Recommended approach**: Change the `AspectRatio ratio` from `16/9` to `3/1` on the card images. This alone will make each card ~40% shorter, guaranteeing 4 cards (2 rows) are visible on tablet/PC without scrolling while keeping the 2-column layout and current gap/padding.

Changes limited to the AspectRatio ratio value in the cards view (applied to both assigned and locked module cards). No other changes.

