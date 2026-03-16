

## Plan: Add debug logging and toast to `connectScribe`

### File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

**Changes to `connectScribe` function (lines 341-366):**

1. Add `console.log` before the `supabase.functions.invoke` call
2. Add `console.log` after to log the response (`tokenData` and `error`)
3. Add a `toast.success` after `scribe.connect()` succeeds to confirm ElevenLabs connection
4. Keep existing error handling unchanged

```typescript
const connectScribe = useCallback(async () => {
  setScribeConnecting(true);
  try {
    console.log('[Scribe] Requesting token from elevenlabs-scribe-token...');
    const { data: tokenData, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
    console.log('[Scribe] Token response:', { tokenData, error });
    if (error || !tokenData?.token) {
      throw new Error(error?.message || 'No token received');
    }
    disconnectingRef.current = false;
    await scribe.connect({
      token: tokenData.token,
      microphone: { echoCancellation: true, noiseSuppression: true },
    });
    console.log('[Scribe] Connected successfully');
    toast.success('Scribe connected to ElevenLabs');
  } catch (err) {
    // existing fallback logic unchanged
  } finally {
    setScribeConnecting(false);
  }
}, [scribe, startBrowserSTT]);
```

Verify that `toast` from `sonner` is already imported in this file (it likely is, given the project pattern).

