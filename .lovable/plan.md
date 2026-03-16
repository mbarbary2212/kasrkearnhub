

## Plan: Add ElevenLabs domains to CSP connect-src

### Problem
The ElevenLabs Scribe WebSocket (STT) and TTS API calls are blocked by the Content Security Policy. The `connect-src` directive in `vercel.json` doesn't include ElevenLabs domains.

### Fix
**File:** `vercel.json` (line 11)

Add `https://*.elevenlabs.io wss://*.elevenlabs.io` to the `connect-src` directive.

The updated `connect-src` will be:
```
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://*.sentry.io https://o4510957724893184.ingest.de.sentry.io https://*.betterstackdata.com https://*.elevenlabs.io wss://*.elevenlabs.io;
```

Single line change, no other modifications needed. Note: there is no CSP meta tag in `index.html` — it's only in `vercel.json`.

