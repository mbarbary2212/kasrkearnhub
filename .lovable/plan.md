

## Plan: Improve Voice Mode UX — Mic Prompt + Larger Speech Bubble with Scroll Animation

### Change 1: Add "Press the microphone to start" hint after greeting

After `greetingPlaying` becomes false and the student hasn't spoken yet (`!isListening && !isSending && !isSpeaking && chatMessages.length <= 1`), show a subtle prompt:

> 🎤 Press the microphone to start asking questions

Fades out once the student starts. Added as a conditional block in the voice mode layout area (~line 900–929).

### Change 2: Enlarge the patient speech bubble

- Move speech bubble out of the cramped left avatar column into the center column area, below the mic button/status indicators
- Size: `max-w-sm w-full`, `max-h-40`, `overflow-y-auto`, `text-base`
- Keep RTL direction and fade transition

### Change 3: Typewriter text reveal synced to TTS duration

Instead of showing full text instantly, animate character-by-character:

- **Default speed**: 20ms per character
- **Dynamic speed**: When TTS audio duration is available (from the `Audio` element's `loadedmetadata` or `durationchange` event), calculate `delay = (duration * 1000) / text.length` so text finishes exactly when audio ends
- **Hard sync rule**: When `isSpeaking` transitions to `false`, immediately set `displayedText` to the full message — no lingering animation after audio stops
- Auto-scroll bubble to bottom as text appears

Implementation: ~20 lines of state + effect near existing voice bubble logic. The effect watches `lastAiMessage`, `isSpeaking`, and a `ttsDuration` value (exposed from the TTS playback path via a ref or state callback).

### Files modified
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx` only

### Files NOT modified
- Edge functions, tts.ts, any other components

