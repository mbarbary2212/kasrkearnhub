

# ElevenLabs Realtime STT — Two Separate Steps

I'll implement this as **two separate messages** so you can revert either independently.

---

## Message 1: Infrastructure (edge function + config + package)

1. **Create `supabase/functions/elevenlabs-scribe-token/index.ts`**
   - POST to `https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` using `ELEVENLABS_API_KEY`
   - Returns `{ token }` with CORS headers

2. **Add to `supabase/config.toml`**:
   ```toml
   [functions.elevenlabs-scribe-token]
   verify_jwt = false
   ```

3. **Install `@elevenlabs/react`** npm package

No frontend changes in this message — the app continues working exactly as before.

---

## Message 2: Replace browser STT with ElevenLabs Scribe

In `HistoryTakingSection.tsx`:

- Import `useScribe` from `@elevenlabs/react`
- Add the `useScribe` hook with `modelId: 'scribe_v2_realtime'`, `commitStrategy: 'vad'`
  - `onCommittedTranscript` → calls `sendChatMessage(text)`
  - `onPartialTranscript` → updates `interimTranscript`
- Rewrite `toggleVoice`:
  1. Fetch token from `elevenlabs-scribe-token` edge function
  2. Call `scribe.connect({ token, microphone: { echoCancellation: true, noiseSuppression: true } })`
  3. If token fetch fails → fall back to existing `webkitSpeechRecognition` logic (moved into a helper)
- To stop: call `scribe.disconnect()`
- Keep text fallback input and mute toggle unchanged

