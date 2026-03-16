

## Plan: Fix Audio Playback by Pre-unlocking in User Gesture

### Problem
`createUnlockedAudio()` on line 216-218 of `HistoryTakingSection.tsx` is called inside `sendChatMessage`, which works when triggered by a button click (chat mode) but **fails** when called from the Scribe `onCommittedTranscript` WebSocket callback (line 113) — browsers block audio not initiated by a user gesture.

### Fix (4 surgical changes, single file)

**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

1. **Add ref** (near line 100, with other refs):
```typescript
const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);
```

2. **Pre-unlock in `toggleVoice`** (line ~393, before `connectScribe()`):
```typescript
// Pre-unlock audio element within user tap gesture context
unlockedAudioRef.current = createUnlockedAudio();
unlockedAudioRef.current.play().catch(() => {});

await connectScribe();
```

3. **Reuse in `sendChatMessage`** (replace lines 216-218):
```typescript
const preUnlockedAudio = selectedMode === 'voice' && !isMuted
  ? (unlockedAudioRef.current ?? createUnlockedAudio())
  : undefined;
```

4. **Clear after TTS, before reconnect** (after `speakArabic` finishes, ~line 258):
```typescript
setIsSpeaking(false);
unlockedAudioRef.current = null;
```

No other logic changes.

