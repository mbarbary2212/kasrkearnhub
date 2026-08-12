# Silence the harmless AbortError from clinical-case voice playback

## What is happening

In the clinical-case history-taking chat, the patient's spoken reply is played by `speakArabic` in `src/utils/tts.ts`. Playback is started with `audio.play()`, and its promise is rejected with `AbortError` whenever the clip is paused, replaced, or torn down before playback actually begins — which is exactly what happens when the student sends another message, mutes, or leaves the page (`stopAllTTS()` runs on unmount).

Today that rejection is treated as a real failure:
- The streaming branch rejects the returned promise, so the caller in `HistoryTakingSection.tsx` lands in its `catch`, logs `Chat error:` and reports the error to Sentry.
- A pause triggered by teardown can also surface as a stream "error".

Nothing about voice behaviour is broken — only the noise.

## The fix

1. **`src/utils/tts.ts`**
   - In the streaming path, replace `audio.play().catch(reject)` with an awaited call wrapped in try/catch: if the rejection is an `AbortError` (or the element was already superseded / its `src` cleared), resolve quietly instead of rejecting.
   - Do the same for the blob-fallback path and for `createUnlockedAudio()` (already silent, kept consistent).
   - Before starting a new clip, stop the previous one deterministically: pause, reset `currentTime`, clear `src`, and drop the reference — so a new clip never races the old one's pending `play()`.
   - Keep the existing `pause` listener behaviour of resolving when the audio was intentionally stopped.

2. **`src/components/clinical-cases/sections/HistoryTakingSection.tsx`**
   - In the send-message `catch`, ignore `AbortError` (and abort-shaped errors) — no console error, no Sentry capture, no error toast — while all other errors keep their current handling.
   - Ensure the component's unmount cleanup stops audio before the element goes away (it already calls `stopAllTTS()`; the tts change makes that abort silent).

## Out of scope

No change to voice selection, tone, providers, streaming vs. fallback, mic reconnection, or telemetry timings.
