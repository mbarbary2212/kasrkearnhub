

## Problem

When the user clicks "Abort Case" in `StructuredCaseRunner`, the browser microphone indicator stays on. The abort handler calls `stopAllTTS()` and navigates away, but it does **not** stop:
1. The native `SpeechRecognition` instance (`recognitionRef` inside `HistoryTakingSection`)
2. The ElevenLabs Scribe WebSocket connection (`useScribe` inside `HistoryTakingSection`)

The `HistoryTakingSection` has cleanup in a `useEffect` return that handles both, but React's unmount during navigation may not reliably close the mic before the browser processes the route change (especially on mobile).

## Solution

Add a **global speech-recognition cleanup registry** in `src/utils/tts.ts` (where `stopAllTTS` already lives), so `HistoryTakingSection` can register its recognition instance and scribe disconnect function, and `stopAllTTS()` — already called by the abort handler — will clean them up.

### Changes

**1. `src/utils/tts.ts`** — Add a registry for active SpeechRecognition and cleanup callbacks:

```typescript
let activeSpeechRecognition: any = null;
const cleanupCallbacks: Set<() => void> = new Set();

export function registerSpeechRecognition(recognition: any) {
  activeSpeechRecognition = recognition;
}

export function registerCleanupCallback(cb: () => void) {
  cleanupCallbacks.add(cb);
  return () => cleanupCallbacks.delete(cb);
}

// In stopAllTTS(), add:
if (activeSpeechRecognition) {
  activeSpeechRecognition.stop();
  activeSpeechRecognition = null;
}
cleanupCallbacks.forEach(cb => { try { cb(); } catch {} });
cleanupCallbacks.clear();
```

**2. `src/components/clinical-cases/sections/HistoryTakingSection.tsx`** — Register the recognition ref and scribe disconnect with the global registry:

- After creating `recognitionRef.current`, call `registerSpeechRecognition(recognition)`
- After nulling it, call `registerSpeechRecognition(null)`
- On mount, register the `safeDisconnect` function via `registerCleanupCallback` and unregister on unmount

This way, when the abort handler calls `stopAllTTS()`, it will also stop the microphone and disconnect the scribe — before React's unmount cycle even begins.

### Files to modify
- `src/utils/tts.ts` (add registry functions, extend `stopAllTTS`)
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx` (register/unregister recognition and scribe)

