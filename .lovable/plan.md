

## Bug Analysis: Double TTS Playback

### Root Cause

The Gemini TTS code paths in `HistoryTakingSection.tsx` have two problems that cause overlapping audio:

1. **No `stopAllTTS()` before Gemini playback**: The `speakArabic` utility calls `stopAllTTS()` before playing ElevenLabs audio, but the inline Gemini code at lines 268-291 and 980-997 does NOT. This means if any previous audio (greeting, prior response) is still playing, it overlaps.

2. **Greeting is fire-and-forget**: The `sendChatMessageInitial` function (line 980) calls `gemini-tts` with `.then()` — it doesn't await. If the user speaks quickly, `sendChatMessage` fires a second Gemini TTS call while the greeting is still playing. Both audio objects play simultaneously because neither checks for or stops the other.

3. **No `currentAudio` tracking for Gemini**: The `stopAllTTS()` utility tracks ElevenLabs audio via `currentAudio` ref, but Gemini creates standalone `new Audio()` elements that are never registered, so `stopAllTTS()` can't stop them.

Additionally, the per-case Gemini voice override (`voiceIdOverride`) is ignored — line 272 always uses `ttsGeminiVoice` from global settings instead of the case-level selection.

### Plan

**File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`**

1. **Add `stopAllTTS()` before every Gemini audio play** — call it at the start of both the greeting and response Gemini branches, before creating the new Audio element.

2. **Track Gemini audio in a ref** — create a `geminiAudioRef` to hold the current Gemini Audio element, and clear/stop it in a cleanup function and before each new play.

3. **Use the per-case voice override for Gemini** — when `voiceIdOverride` is set and `ttsProvider === 'gemini'`, use it as the `voiceName` instead of the global `ttsGeminiVoice`. This respects the case editor's Gemini voice dropdown.

4. **Await the greeting TTS** — convert the `.then()` pattern in `sendChatMessageInitial` to `async/await` or track the audio so it can be stopped.

**File: `src/utils/tts.ts`**

5. **Export a `registerAudio` helper** — allow external code to register audio elements so `stopAllTTS()` can stop them too. Alternatively, expand `stopAllTTS()` to accept and stop arbitrary Audio elements.

### Summary of changes

| File | Change |
|------|--------|
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Add `stopAllTTS()` calls before Gemini playback; track Gemini audio for cleanup; use per-case voice override; fix fire-and-forget greeting |
| `src/utils/tts.ts` | Add `registerCurrentAudio()` export so Gemini audio can be tracked by `stopAllTTS()` |

