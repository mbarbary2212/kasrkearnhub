

## Plan: Downsample Gemini TTS audio from 24kHz to 16kHz

### Change

**File: `supabase/functions/gemini-tts/index.ts` (lines 10–35)**

Replace the existing `addWavHeader` function with the user-provided version that:
- Accepts `inputSampleRate` (24000) and `outputSampleRate` (16000) parameters
- Downsamples PCM audio using linear interpolation before WAV encoding
- Reduces output size by ~33% with no perceptible quality loss for speech

One function replacement, one file. Nothing else modified.

