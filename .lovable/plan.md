
What happened (why it looks unchanged)
- In the previous update, I made the layout “sticky” structurally (fixed top and bottom regions), but the timer and question count stayed in their original visual rows.
- So behavior improved (middle area scrolls), but position did not become “floating over the dialogue,” which is what you want.

Plan (minimal UI change only)
1. Update only `src/components/clinical-cases/sections/HistoryTakingSection.tsx`.
2. In History Taking interactive UI, move:
   - Timer badge → from header row into an absolute overlay inside the dialogue panel.
   - “X questions asked” → from footer row into an absolute overlay inside the dialogue panel.
3. Keep everything else visually unchanged:
   - Same avatar/header content
   - Same input row
   - Same End Conversation button style and placement behavior
   - Same spacing/typography/colors except for overlay placement
4. Add only the minimum spacing needed in the scrollable dialogue area (`pt/pb`) so floating badges do not overlap first/last messages.
5. Apply the same floating-overlay behavior consistently in both chat and voice interaction blocks (so the timer/counter behave the same regardless of selected mode).

Technical details
- Convert the dialogue container to `relative`.
- Add two positioned overlay wrappers:
  - `absolute top-3 right-3 z-20` for timer
  - `absolute bottom-3 left-3 z-20` for questions count
- Keep overlays non-interactive (`pointer-events-none`) to avoid blocking chat/voice controls.
- Keep the scroll container as the only scrolling region (`flex-1 min-h-0 overflow-y-auto`) and add safe padding to preserve readability.
- Remove old inline placements of timer/counter from header/footer without changing other controls.
