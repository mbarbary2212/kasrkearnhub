

## Add AbortController Timeout to Gemini TTS Fetch

**Single file:** `supabase/functions/gemini-tts/index.ts`

### Change

Inside the `callGemini` function (lines 75-106), wrap the fetch call with an `AbortController` that aborts after 15 seconds, add a status log immediately after fetch, and catch `AbortError` separately.

**Lines 75-106 become:**

```typescript
async function callGemini(inputText: string, voiceName: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: {
          'X-Goog-Api-Key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    console.log('[gemini-tts] Gemini API responded:', response.status);
    // ... rest unchanged (error check, parse JSON, return)
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[gemini-tts] Gemini API timed out after 15s');
      return { ok: false, status: 504, audioData: null, finishReason: 'TIMEOUT' };
    }
    throw err;
  }
}
```

The timeout return uses `status: 504` so the existing error handling at lines 115-120 will return a 504 to the client. Nothing else changes.

