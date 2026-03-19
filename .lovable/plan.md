

## Fix: Scribe WebSocket Timeout During Gemini TTS Greeting

### Problem
When the user clicks "Voice," the greeting TTS starts asynchronously but the mic button is immediately clickable. If the student clicks the mic while the greeting is still playing/loading, the Scribe WebSocket connects and then sits idle — timing out before the student actually speaks. This produces "WebSocket is not connected" errors.

### Root Cause
`sendChatMessageInitial('voice')` is called without `await` inside the onClick handler (line 665). The voice UI renders instantly with an active mic button, allowing premature Scribe connection.

### Plan (single file: `HistoryTakingSection.tsx`)

**1. Add `greetingPlaying` state**
- New `useState<boolean>(false)` to track whether the greeting TTS is in progress.

**2. Set the flag around greeting TTS in `sendChatMessageInitial`**
- Set `greetingPlaying = true` before the TTS call.
- Set `greetingPlaying = false` after the audio finishes (after `await audio.play()` resolves and `onended` fires for Gemini, or after `speakArabic` resolves for ElevenLabs).
- Also set it `false` in a catch/finally to handle errors.

**3. Disable mic button while greeting is playing**
- Add `greetingPlaying` to the mic button's `disabled` condition (line 843).
- Show a "Patient is speaking..." label below the mic button when `greetingPlaying` is true, similar to the existing "جاري الاستماع..." indicator.

**4. No other files touched**
- No changes to the ElevenLabs block logic, gemini-tts edge function, or tts.ts.

### Technical Detail

```text
Current flow:
  Click Voice → setSelectedMode('voice') → sendChatMessageInitial() [fire-and-forget]
  → Voice UI renders → mic button active → user clicks → Scribe connects → times out

Fixed flow:
  Click Voice → setSelectedMode('voice') → sendChatMessageInitial() [fire-and-forget]
  → greetingPlaying=true → Voice UI renders → mic button DISABLED ("Patient speaking...")
  → greeting finishes → greetingPlaying=false → mic button active → user clicks → Scribe connects
```

