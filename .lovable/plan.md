

# Auto-Scroll Patient Speech Bubble

## Current behavior
The speech bubble has `max-h-24 overflow-y-auto` — long text overflows and requires **manual scrolling**. In voice mode, the student is listening, not interacting with the bubble, so manual scroll is impractical.

## Proposed fix
Add a `useEffect` that auto-scrolls the speech bubble to the bottom whenever `lastAiMessage` changes. This uses a ref on the bubble div and sets `scrollTop = scrollHeight` with smooth scroll behavior.

## Changes — `HistoryTakingSection.tsx`

1. Add a `useRef` for the speech bubble div (e.g. `voiceBubbleRef`)
2. Add a `useEffect` watching `lastAiMessage` that smoothly scrolls the ref to bottom:
   ```ts
   useEffect(() => {
     if (voiceBubbleRef.current) {
       voiceBubbleRef.current.scrollTo({ top: voiceBubbleRef.current.scrollHeight, behavior: 'smooth' });
     }
   }, [lastAiMessage]);
   ```
3. Attach the ref to the speech bubble `<div>` at line 729

One ref + one effect — no other changes.

