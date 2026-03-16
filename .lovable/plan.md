

## Problem

The TTS audio is fetched successfully (200 with MP3 data), but `audio.play()` is blocked by the browser's autoplay policy. The call chain is: user clicks mic → Scribe transcribes → `sendChatMessage` → fetch AI response → `speakArabic` → fetch TTS audio → `new Audio()` → `audio.play()`. By this point, the browser no longer considers it a user gesture, so playback is silently rejected.

## Solution

Pre-create and "unlock" an `Audio` element during the user gesture (when the mic button is clicked or when `sendChatMessage` is triggered by the transcript commit). Then reuse that unlocked element for TTS playback instead of creating a new one after the async fetch.

### File: `src/utils/tts.ts`

**Change the `speakArabic` function to accept an optional pre-unlocked `Audio` element.** If not provided, create one as before (backward compatible).

```typescript
export async function speakArabic(
  text: string,
  provider: 'browser' | 'elevenlabs',
  voiceId?: string,
  tone?: PatientTone,
  preUnlockedAudio?: HTMLAudioElement  // NEW optional param
): Promise<void> {
```

Inside the ElevenLabs branch, instead of `const audio = new Audio(audioUrl)`, reuse the pre-unlocked element:

```typescript
const audio = preUnlockedAudio || new Audio();
audio.src = audioUrl;
```

**Add a new exported helper to create and unlock an Audio element:**

```typescript
/** Create and unlock an Audio element (call synchronously in a user gesture) */
export function createUnlockedAudio(): HTMLAudioElement {
  const audio = new Audio();
  audio.play().catch(() => {}); // unlock for autoplay policy
  audio.pause();
  return audio;
}
```

### File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

**In `sendChatMessage`** — right at the start (still in user gesture context from the transcript commit), create the unlocked audio element and pass it through to `speakArabic`:

```typescript
const sendChatMessage = useCallback(async (text: string) => {
  console.log('[sendChatMessage] called with:', text);
  if (!text.trim() || !caseId) return;

  // Pre-unlock audio element while still in user gesture context
  const preUnlockedAudio = selectedMode === 'voice' && !isMuted
    ? createUnlockedAudio()
    : undefined;

  // ... existing fetch logic ...

  // Then pass it to speakArabic:
  await speakArabic(reply, ttsProvider, voiceId, patientTone, preUnlockedAudio);
```

This ensures the `Audio` element is created and `.play()` is called synchronously within the user gesture chain, then reused when the actual audio data arrives.

### Dependency array fix

Add `isMuted` and `selectedMode` to the `sendChatMessage` `useCallback` dependency array (they're already likely there but need verification).

## Technical detail

- `createUnlockedAudio()` calls `audio.play()` immediately (which plays silence and unlocks the element), then `audio.pause()`.
- When the TTS fetch completes, we set `audio.src = blobUrl` on the same element and call `audio.play()` again — this time the browser allows it because the element was already unlocked in a user gesture.
- The `stopAllTTS()` function continues to work as before since `currentAudio` still tracks the active element.
- Backward compatible: all other callers of `speakArabic` (e.g., CasePreviewEditor) don't pass `preUnlockedAudio` and work as before.

