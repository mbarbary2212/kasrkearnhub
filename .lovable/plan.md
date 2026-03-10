

# Fix: Stop TTS Audio Immediately on Abort/Navigation

## Problem

When the user aborts a case (or navigates away), the ElevenLabs audio keeps playing because the `speakArabic` function creates a standalone `Audio` object with no way to stop it later. The browser TTS has `speechSynthesis.cancel()` but the ElevenLabs audio reference is lost.

## Changes

### 1. `src/utils/tts.ts` -- Add global audio tracking + stop function

- Store the currently playing `Audio` instance in a module-level variable
- Export a new `stopAllTTS()` function that:
  - Pauses and cleans up the ElevenLabs `Audio` object
  - Calls `window.speechSynthesis.cancel()` for browser TTS
- In `speakArabic`, stop any previous audio before starting new playback

### 2. `src/components/clinical-cases/StructuredCaseRunner.tsx` -- Stop audio on abort + add abort dialog to Back button

- Import `stopAllTTS` from `@/utils/tts`
- Call `stopAllTTS()` inside the existing Abort Case `onClick` handler before navigating
- Wrap the existing **Back** button (top-left, currently in `VirtualPatientPage.tsx`) with an `AlertDialog` abort confirmation when a case is running -- but since Back is on the intro page (not inside the runner), this is already handled by the abort button
- Add cleanup on unmount via `useEffect` that calls `stopAllTTS()` when the component unmounts (handles browser back, home navigation, etc.)

### 3. Navigation guard considerations

The `useEffect` cleanup on unmount will catch all navigation scenarios (browser back, clicking Home, clicking avatar/logo) without needing individual abort dialogs on every nav element. The existing Abort button dialog remains the explicit confirmation path.

## Summary of behavior after fix

| Action | Abort dialog? | Audio stops? |
|--------|--------------|-------------|
| Click Abort button | Yes (existing) | Immediately on confirm |
| Browser back / Home / avatar | No dialog (unmount cleanup) | Immediately |
| Mute toggle | No | Immediately (already works) |

