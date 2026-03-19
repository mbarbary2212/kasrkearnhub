

## Fix: Gemini TTS "finishReason: OTHER" — No Audio Generated

### Root Cause
The Gemini TTS API returns `finishReason: "OTHER"` with no audio data. This is Google's content/safety filter silently rejecting the request. The edge function code and client code are both correct and deployed.

### Plan (2 files)

**1. `supabase/functions/gemini-tts/index.ts` — Add retry with stripped style prompt**
- When the first Gemini call returns no audio data (`finishReason: OTHER`), retry once **without** the style prompt (plain text only)
- Add logging to distinguish first-attempt vs retry
- This handles cases where the style prompt triggers the filter

**2. `src/components/clinical-cases/sections/HistoryTakingSection.tsx` — Handle TTS failure gracefully**
- In both the reply and greeting Gemini blocks, if the fetch returns a non-ok status or an empty/tiny blob (< 100 bytes), log a warning and skip audio playback instead of throwing
- This prevents the UI from getting stuck when Gemini intermittently fails

### Technical Detail

```text
Current flow:
  Client → gemini-tts → Gemini API → finishReason: OTHER → 500 error → throw → no audio

Fixed flow:
  Client → gemini-tts → Gemini API → finishReason: OTHER
    → retry without stylePrompt → Gemini API → audio data → WAV → 200
    → if still no audio → 500 with clear error
  Client: if blob < 100 bytes or !res.ok → log warning, skip audio, continue
```

### Why not just remove the style prompt?
The style prompt controls emotional tone (worried, in_pain, calm). Removing it entirely degrades the simulation quality. The retry-without-style approach preserves tone when it works and falls back gracefully when it doesn't.

