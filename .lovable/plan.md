

# Fix: ElevenLabs Scribe Cuts Off Mid-Sentence

## Problem
The VAD (Voice Activity Detection) commits the transcript too quickly when the student pauses briefly mid-sentence. This is especially common in Arabic where speakers naturally pause between phrases.

## Solution
In `HistoryTakingSection.tsx`, add `endOfSpeechSilenceThreshold` to the `useScribe` config. The default is likely ~500ms which is too short for conversational Arabic. Setting it to **1500ms** gives speakers a comfortable pause window without feeling sluggish.

```typescript
const scribe = useScribe({
  modelId: 'scribe_v2_realtime',
  commitStrategy: CommitStrategy.VAD,
  endOfSpeechSilenceThreshold: 1500, // 1.5s silence before committing
  onCommittedTranscript: ...
});
```

## About the Timer
A countdown timer already exists in voice and chat modes — it's calculated as 40% of the case's estimated duration, with visual nudges (color changes, pulsing) as it approaches zero. A hard cap of 15 student messages also prevents token burn. No additional timer work needed.

## File Changed
| File | Change |
|------|--------|
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Add `endOfSpeechSilenceThreshold: 1500` to useScribe config (line 98) |

One-line change. Safe to deploy immediately.

