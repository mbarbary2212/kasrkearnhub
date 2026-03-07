

## Plan: Fix Voice Mode — Speech Speed & Recognition Issues

**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

### Changes

**1. Add `toast` import** (line 1 area)
- Import `toast` from `sonner`

**2. Add new state variables** (after line 56):
- `interimTranscript: string` — live partial transcript
- `voiceErrorCount: number` — consecutive error tracker
- `showVoiceFallbackInput: boolean` — fallback text input toggle
- `voiceFallbackInput: string` — fallback input value

**3. Fix speech rate + cancel queued speech** (lines 97-101 and in `sendChatMessageInitial`):
- Change `utterance.rate = 0.9` → `utterance.rate = 1.1`
- Add `window.speechSynthesis.cancel()` before each `.speak()` call

**4. Rewrite `toggleVoice` callback** (lines 115-151):
- Set `recognition.interimResults = true`
- `onresult`: update `interimTranscript` with interim results; only call `sendChatMessage` on final results; reset `voiceErrorCount` on success
- `onaudiostart`: no-op (confirms mic working)
- `onerror`: show toast with specific error (`not-allowed`, `no-speech`, `language-not-supported`); increment `voiceErrorCount`; if ≥ 2, set `showVoiceFallbackInput = true`
- `onend`: clear `interimTranscript`

**5. Voice mode UI additions** (lines 414-427 area):
- Below mic button: show animated pulsing dot + `interimTranscript` in real-time when `isListening`
- When `showVoiceFallbackInput` is true: render text input + send button so student can type Arabic and get TTS responses via same `sendChatMessage`

No other logic, layout, or functionality changes.

