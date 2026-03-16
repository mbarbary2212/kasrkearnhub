

## Plan: Update CSP for ElevenLabs AudioWorklet Support

### Problem
ElevenLabs Scribe uses AudioWorklet processors that load via blob URLs and run as workers. The current CSP blocks these, preventing voice from working.

### Fix
**File:** `vercel.json` (line 11)

Two additions to the CSP value string:

1. **`script-src`**: Add `blob:` → `script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://www.youtube.com`
2. **Add `worker-src`**: Insert `worker-src blob: data: 'self';` directive

No other changes.

