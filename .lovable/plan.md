

# Implementation Plan: Auto-Reconnect Mic + Speech Bubble Scroll

Three changes across two files, all approved in prior conversations.

## 1. `src/utils/tts.ts` — speakArabic resolves on playback END

Replace the current `audio.play()` + immediate return with a Promise wrapper:
- **ElevenLabs path**: Wrap in `new Promise` that resolves on `ended` event, rejects on `error`, and resolves gracefully on external `pause` (from `stopAllTTS()`). Also `revokeObjectURL` on completion.
- **Browser path**: Wrap `speechSynthesis.speak()` in a Promise using `utterance.onend` / `utterance.onerror`.

This lets callers `await speakArabic(...)` to know when the patient finishes talking.

## 2. `src/components/clinical-cases/sections/HistoryTakingSection.tsx` — Auto-reconnect flow

**In `sendChatMessage` (line ~197-205)**: After getting the AI reply in voice mode:
1. `scribe.disconnect()` — stop listening during TTS
2. `await speakArabic(reply, ...)` — wait for TTS to finish
3. `await new Promise(r => setTimeout(r, 800))` — 800ms conversational pause
4. Auto-reconnect scribe (call the same connect logic used in `toggleVoice`)

Extract the scribe connect logic into a reusable `connectScribe()` helper so both `toggleVoice` and the auto-reconnect can use it.

**In `onCommittedTranscript` (line 106-111)**: Add `scribe.disconnect()` after `sendChatMessageRef.current(data.text)` to immediately stop listening when the student finishes speaking (prevents echo pickup).

**Muted path**: If muted, skip `speakArabic`, wait 200ms, then reconnect immediately.

## 3. Speech bubble (line 711)

Replace `line-clamp-2` with `max-h-24 overflow-y-auto` so long patient responses scroll instead of being truncated.

## Files Changed
- `src/utils/tts.ts`
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

## What doesn't change
- All chat mode logic, phase transitions, scoring, timer, message caps
- No other files affected

