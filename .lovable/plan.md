

# Voice Preview Button in Case Editor

## Problem
Admins must start a full case attempt just to hear how a voice sounds, polluting analytics with test attempts.

## Solution
Add a **"Preview Voice"** button next to the Voice Character dropdown in the case editor. When clicked, it sends a short sample Arabic phrase to the ElevenLabs TTS edge function using the currently selected voice and tone, and plays it back immediately. No attempt is created.

## Changes

### `src/components/clinical-cases/CasePreviewEditor.tsx`
- Import `Volume2` icon from lucide-react and `speakArabic`, `stopAllTTS` from `@/utils/tts`
- Add a small "Preview" icon button next to the Voice Character `<Select>` (or below it alongside the "Contact platform admin" link)
- On click:
  1. Resolve the voice ID (selected or global default from admin settings)
  2. Call `speakArabic(sampleText, 'elevenlabs', voiceId, tone)` with a short Arabic sample like `"مرحباً يا دكتور، أنا عندي مشكلة عايز أقولك عليها"` (a natural Egyptian Arabic greeting)
  3. Show a loading spinner while audio loads, then auto-play
- If already playing, clicking again calls `stopAllTTS()` (toggle behavior)
- Add a small `useState<boolean>` for `isPreviewPlaying` to toggle the button icon between play/stop

### No backend changes needed
The existing `elevenlabs-tts` edge function already accepts `text`, `voiceId`, `tone`, and `speed` -- the preview button just calls `speakArabic()` directly which already hits that function.

### UI Layout
Below the voice select dropdown, next to the "Contact platform admin" link:
```
[Voice Character dropdown          ]
🔊 Preview voice  |  Can't find the right voice? Contact platform admin
```

