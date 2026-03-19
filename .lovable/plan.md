

## Optimize Gemini TTS Performance

Two files, two changes: eliminate base64 encoding overhead and remove the unnecessary role check.

### File 1: `supabase/functions/gemini-tts/index.ts`

**A. Update `addWavHeader` to return `ArrayBuffer`** (lines 9-41)
- Change return type from `string` to `ArrayBuffer`
- Remove the btoa encoding loop at the end (lines 33-40)
- Just `return buffer` directly

**B. Remove role check** (lines 56, 65-72)
- Remove `serviceRoleKey` variable, `svcClient` creation, `roleData` query, `allowedRoles` check
- Keep the Bearer token extraction and `getUser()` verification

**C. Return raw binary WAV** (lines 138-142)
- Change `addWavHeader` call to get the ArrayBuffer directly
- Return `new Response(wavBuffer, { headers: { ...corsHeaders, 'Content-Type': 'audio/wav' } })`

### File 2: `HistoryTakingSection.tsx`

**A. Reply handler** (lines 272-294) — Replace `supabase.functions.invoke` + atob decoding with:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-tts`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: reply, voiceName: geminiVoiceToUse, stylePrompt: geminiStylePrompt }),
});
if (!res.ok) throw new Error(`Gemini TTS failed: ${res.status}`);
const blob = await res.blob();
const blobUrl = URL.createObjectURL(blob);
const audio = preUnlockedAudio || new Audio();
audio.src = blobUrl;
registerCurrentAudio(audio);
await audio.play();
await new Promise<void>(resolve => {
  audio.onended = () => { URL.revokeObjectURL(blobUrl); resolve(); };
});
```

**B. Greeting handler** (lines 1003-1020) — Same pattern but with `greeting` text and `new Audio()` (no preUnlockedAudio).

### Performance gains
- ~33% smaller network payload (no base64 inflation)
- No client-side `atob` + byte-by-byte copy
- No server-side `btoa` chunked encoding
- No `user_roles` DB query (~200-400ms saved per call)

