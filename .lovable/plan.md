

# Plan: Scribe Unmount Cleanup + TutorPage Auth Fix

Two independent fixes from the conversation above.

## Fix 1: ElevenLabs Scribe WebSocket Cleanup on Unmount
**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

Add a ref-based cleanup `useEffect` after line 129 (after the `scribe.isConnected` sync effect):

```typescript
// Cleanup: disconnect scribe on unmount to prevent WS race condition
const scribeRef = useRef(scribe);
scribeRef.current = scribe;

useEffect(() => {
  return () => {
    if (scribeRef.current.isConnected) {
      scribeRef.current.disconnect();
    }
  };
}, []);
```

This prevents the "WebSocket is not connected" Sentry error (1 event, 1 user) caused by the audio worklet sending data after navigation away.

## Fix 2: TutorPage Auth — Use Session Token Instead of Anon Key
**File:** `src/pages/TutorPage.tsx`

The `TutorPage.tsx` `streamChat` function uses `VITE_SUPABASE_PUBLISHABLE_KEY` for auth (line 45), while `useTutorChat.ts` correctly uses `session.access_token`. This means TutorPage sends requests as anonymous rather than as the authenticated user, which bypasses per-user rate limits and moderation.

Update `streamChat` in `TutorPage.tsx` to match `useTutorChat.ts`:
- Get the session via `supabase.auth.getSession()`
- Use `session.access_token` in the `Authorization` header
- Show a toast if the user isn't signed in

This aligns both chat implementations.

## Summary

| File | Change |
|------|--------|
| `HistoryTakingSection.tsx` | Add ref-based scribe cleanup on unmount (after line 129) |
| `TutorPage.tsx` | Replace anon key auth with session token in `streamChat` |

