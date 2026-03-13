

# Voice Mode Layout Polish

## My thoughts

**Mic centering:** Currently the center column uses `items-start pt-2` which pushes everything top-left. Changing to `items-center justify-center` will place the mic dead center between both avatars — much more natural for a face-to-face feel.

**Shorter container:** The `h-[calc(100vh-280px)]` is too generous. Reducing to `h-[calc(100vh-340px)]` trims ~60px, keeping everything tighter on the 589px tablet viewport.

**English vs Arabic transcript:** That's not a bug — the interim transcript shows what the student is saying in real-time (speech-to-text). If the student speaks English, it shows English. However, I recommend **removing the interim transcript display entirely** in voice mode. It adds visual noise and doesn't help the consultation flow — the student knows what they just said. This makes the experience faster and cleaner. The speech-to-text still works, the text just won't be shown on screen.

**Patient speech bubble size:** Currently `text-[11px]` which is tiny. Bump to `text-sm` (14px) to match normal readable text. Also widen slightly so Arabic text isn't so cramped.

## Changes — `HistoryTakingSection.tsx`

### Voice mode center column (line 721)
- Change `items-start pt-2` → `items-center justify-center`
- Remove the interim transcript display block (lines 746-761) — the `interimTranscript` variable still gets captured and sent, just not shown
- Remove the status text lines ("اضغط للتحدث", "جاري الاتصال...") — keep only the "جاري التفكير..." spinner when sending

### Container height (line 693)
- `h-[calc(100vh-280px)]` → `h-[calc(100vh-340px)]`

### Patient speech bubble (lines 710-717)
- `text-[11px]` → `text-sm`
- `px-1.5 py-0.5` → `px-2 py-1`
- Keep `line-clamp-2`

### What doesn't change
- All voice recording logic, interim transcript capture, AI calls
- Chat mode layout (unaffected)
- Footer, timer, phase transitions

