

## Plan: Add output_format to ElevenLabs TTS edge function

### What
Add `?output_format=mp3_22050_32` as a query parameter to the ElevenLabs API URL to reduce audio bitrate from 128kbps to 32kbps (~4× smaller downloads, same speech clarity).

### Change

**File: `supabase/functions/elevenlabs-tts/index.ts` (line 98)**

Change:
```
`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`
```
to:
```
`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`
```

One line, one file. Nothing else modified.

