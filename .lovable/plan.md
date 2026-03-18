

## Plan: Fix Gemini TTS — WAV Header + Blob Playback

### 3 Changes

**1. Edge function (`supabase/functions/gemini-tts/index.ts`) — Add WAV header helper**

Add the `addWavHeader` function before the `serve()` call. This converts raw PCM (audio/L16) from Gemini into a proper WAV file browsers can play. Uses chunked `String.fromCharCode` to avoid Deno stack overflow on large buffers.

Then replace lines 104-107 (the return statement) to call `addWavHeader(audioData)` and return `{ audioContent: wavBase64, mimeType: 'audio/wav' }`.

**2. Frontend reply handler (`HistoryTakingSection.tsx` ~line 273-277)**

Replace the `data:` URI approach with blob URL:
```
const byteCharacters = atob(data.audioContent)
const byteArray = new Uint8Array(byteCharacters.length)
for (let i = 0; i < byteCharacters.length; i++) {
  byteArray[i] = byteCharacters.charCodeAt(i)
}
const blob = new Blob([byteArray], { type: 'audio/wav' })
const blobUrl = URL.createObjectURL(blob)
const audio = preUnlockedAudio || new Audio()
audio.src = blobUrl
audio.onended = () => URL.revokeObjectURL(blobUrl)
await audio.play()
await new Promise<void>(resolve => { audio.onended = () => { URL.revokeObjectURL(blobUrl); resolve(); }; })
```

**3. Frontend greeting handler (`HistoryTakingSection.tsx` ~line 971-973)**

Same blob URL approach:
```
const byteCharacters = atob(data.audioContent)
const byteArray = new Uint8Array(byteCharacters.length)
for (let i = 0; i < byteCharacters.length; i++) {
  byteArray[i] = byteCharacters.charCodeAt(i)
}
const blob = new Blob([byteArray], { type: 'audio/wav' })
const blobUrl = URL.createObjectURL(blob)
const audio = new Audio()
audio.src = blobUrl
audio.onended = () => URL.revokeObjectURL(blobUrl)
audio.play()
```

No other files touched. The rollup build error is a platform infrastructure issue unrelated to these changes.

