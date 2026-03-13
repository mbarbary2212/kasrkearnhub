

# Implement Glowing Avatar Rings — State-Aware Feedback

## Changes

### 1. `tailwind.config.ts` — Append 3 new keyframes + 3 new animations

**After** the existing `pulse-ring` keyframe (line 108), add:
- `pulse-ring-green` — green glow (student speaking / listening)
- `pulse-ring-blue` — blue glow (patient speaking via TTS)
- `pulse-ring-amber` — amber glow with slower rhythm (AI thinking)

**After** the existing `pulse-ring` animation (line 122), add the 3 matching animation entries. No existing entries touched.

### 2. `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

**Add `isSpeaking` state** (near line 86, with other voice states):
```js
const [isSpeaking, setIsSpeaking] = useState(false);
```

**Wrap `speakArabic` call** (line 224) with try/finally:
```js
setIsSpeaking(true);
try {
  await speakArabic(reply, ttsProvider, voiceId, patientTone);
} finally {
  setIsSpeaking(false);
}
```

**Voice mode — Patient avatar (line 730)**: Replace `isListening && 'animate-pulse-ring'` with priority:
- `isSpeaking` → `animate-pulse-ring-blue`
- `isSending` → `animate-pulse-ring-amber`
- `isListening` → `animate-pulse-ring-green`

**Voice mode — Student avatar (line 791)**: Add wrapper div with `animate-pulse-ring-green` when `isListening`.

**Chat mode — Patient avatar (line 608)**: Add wrapper div with `animate-pulse-ring-amber` when `isSending`.

