

## Fix: Audio Never Plays Due to Autoplay Policy Violation

### Root Cause
The browser's autoplay policy requires `Audio.play()` to happen within (or very close to) a direct user gesture. In the current code:

1. **Greeting**: User clicks "Voice" → `sendChatMessageInitial` runs several async operations (getSession, fetch, blob) → creates `new Audio()` → `audio.play()` is BLOCKED because the user gesture context expired.
2. **Replies**: `unlockedAudioRef.current` is pre-unlocked in `toggleVoice` (mic click), but after the first reply it's set to `null` and never refreshed. Subsequent replies create fresh `new Audio()` outside a user gesture, also blocked.
3. **ElevenLabs path**: Same issue — `speakArabic()` is called without a `preUnlockedAudio` argument in the greeting, and the internal `new Audio()` also gets blocked.

### Fix (1 file: `HistoryTakingSection.tsx`)

**Change 1: Pre-unlock audio SYNCHRONOUSLY in the "Voice" button click handler**

In the onClick for the Voice button (line 666-670), create and store the unlocked audio element BEFORE calling `sendChatMessageInitial`:

```typescript
onClick={() => {
  // Pre-unlock audio in direct user gesture context
  const preAudio = createUnlockedAudio();
  unlockedAudioRef.current = preAudio;
  setSelectedMode('voice');
  setShowVoiceFallbackInput(true);
  sendChatMessageInitial('voice', preAudio);
}}
```

**Change 2: Accept and use pre-unlocked audio in `sendChatMessageInitial`**

Update the function signature to accept an optional pre-unlocked audio element:

```typescript
async function sendChatMessageInitial(mode: 'chat' | 'voice', preUnlockedAudio?: HTMLAudioElement) {
```

In the Gemini path (line 1024), use the pre-unlocked audio instead of `new Audio()`:
```typescript
const audio = preUnlockedAudio || new Audio();
```

In the ElevenLabs path (line 1034), pass the pre-unlocked audio:
```typescript
await speakArabic(greeting, ttsProvider, voiceId, patientTone, preUnlockedAudio);
```

**Change 3: Re-create unlocked audio after each reply (not just null it)**

In `sendChatMessage` (around line 302-304), after TTS finishes, refresh the unlocked audio reference for the next reply instead of nulling it:

```typescript
// Instead of: unlockedAudioRef.current = null;
unlockedAudioRef.current = createUnlockedAudio();
```

This works because the `toggleVoice` user gesture previously "activated" audio on the page, and many browsers allow subsequent Audio objects if the page is already "activated".

**Change 4: Add diagnostic console.log to greeting path**

Add logging before and after `audio.play()` in the greeting to make failures visible:

```typescript
console.log('[Greeting TTS] Playing audio, blob size:', blob.size);
await audio.play();
console.log('[Greeting TTS] Audio started');
```

### Files Changed
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx` (4 small edits)

### Why this fixes both providers
- ElevenLabs greeting: `speakArabic()` receives `preUnlockedAudio`, uses it instead of creating a fresh blocked `new Audio()`
- Gemini greeting: Uses the same pre-unlocked element directly
- Both reply paths: `unlockedAudioRef.current` is refreshed after each reply instead of being nulled

