

## Plan: Fix ElevenLabs TTS playback in HistoryTakingSection

### Root cause analysis

There is **no `AudioContext`** in the project's own code. The `InvalidStateError: Cannot close a closed AudioContext` is coming from the `@elevenlabs/react` Scribe SDK (used for speech-to-text), which manages its own internal `AudioContext`. The error occurs because:

1. `stopAllTTS()` is called at the start of `speakArabic()` (line 98 of `tts.ts`), which sets `currentAudio.src = ''` — this destroys the **pre-unlocked audio element** that was passed in as `preUnlockedAudio`
2. Then on line 126, `speakArabic` tries to reuse that same destroyed element: `const audio = preUnlockedAudio || new Audio()`
3. Setting `.src = ''` on an Audio element puts it in a broken state; subsequent `.play()` calls fail silently or throw

The Scribe SDK's internal AudioContext error is a red herring — it happens when the Scribe disconnects/reconnects around TTS playback, but the real playback failure is the destroyed pre-unlocked element.

### Changes

#### File: `src/utils/tts.ts`

**Change 1** — In `stopAllTTS()`, skip destruction if the audio being stopped is the same element that will be reused. Instead, just pause without clearing src:

Actually, the cleaner fix: `speakArabic` should **not** pass through the pre-unlocked audio to `stopAllTTS`. The fix is to stop previous audio, then set up the new audio on the pre-unlocked element cleanly.

- **Line 96-98**: Move `stopAllTTS()` call to happen **before** checking the pre-unlocked audio, but protect the pre-unlocked element from being destroyed. Specifically: if `currentAudio === preUnlockedAudio`, just pause it (don't clear src). Then set the new src on it.

Simplest correct fix — two changes in `speakArabic`:

1. **Lines 97-98**: Replace `stopAllTTS()` with targeted cleanup that preserves `preUnlockedAudio`:
   ```typescript
   // Stop previous audio without destroying the pre-unlocked element
   if (currentAudio && currentAudio !== preUnlockedAudio) {
     currentAudio.pause();
     currentAudio.currentTime = 0;
     currentAudio.src = '';
   } else if (currentAudio) {
     currentAudio.pause();
   }
   currentAudio = null;
   window.speechSynthesis?.cancel();
   ```

2. **Line 151**: Add `.catch` with explicit error logging:
   ```typescript
   audio.play().catch((err) => {
     console.error('[TTS] Play failed:', err);
     if (currentAudio === audio) currentAudio = null;
     URL.revokeObjectURL(audioUrl);
     resolve();
   });
   ```
   (Change `console.warn` → `console.error` and update message to match required pattern)

#### File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

**Change 1** — Response TTS Gemini path (lines 305-319): Add `.catch` error logging to `audio.play()` — already present, just needs the `[TTS] Play failed:` prefix for consistency.

**Change 2** — Greeting TTS Gemini path (lines 1084-1098): Same — already has error logging, just ensure consistent prefix.

**No other changes needed** — the Gemini and ElevenLabs paths are already fully separate (Gemini handled inline in HistoryTakingSection, ElevenLabs via `speakArabic`). No AudioContext exists in project code.

### Files modified
- `src/utils/tts.ts` — fix `stopAllTTS` interaction with pre-unlocked audio; improve error logging
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx` — consistent error log prefixes only

### Files NOT modified
- Edge functions, Scribe/WebSocket code, chat/scoring logic, ttsProvider selection logic

