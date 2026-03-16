

## Plan: Harden TTS auth in `src/utils/tts.ts`

Two small changes in `src/utils/tts.ts`:

1. **Line 93-94**: After getting the session, throw if no token instead of silently falling back to anon key:
   ```typescript
   const accessToken = session?.access_token;
   if (!accessToken) throw new Error('No session token — user not logged in');
   ```

2. **Lines 99-102**: Remove the `apikey` header and the fallback:
   ```typescript
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${accessToken}`,
   },
   ```

This ensures a clear error if the user isn't logged in (caught by the existing `catch` block which falls back to browser TTS) and removes the unnecessary `apikey` header.

