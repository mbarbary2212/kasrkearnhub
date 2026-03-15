

# Fix CSP to Allow YouTube IFrame API and Better Stack

## Problem
The Content Security Policy in `vercel.json` blocks the YouTube IFrame Player API script because `https://www.youtube.com` is not in `script-src`. The player loads `https://www.youtube.com/iframe_api` as a script tag, which gets blocked.

Also missing: Better Stack domain in `connect-src` for the new error tracking integration.

## Change

### `vercel.json` — Update CSP headers

Add to `script-src`:
- `https://www.youtube.com` (for the IFrame API script)

Add to `connect-src`:
- `https://*.betterstackdata.com` (for Better Stack error reporting)

No other files need changes. The YouTubePlayer.tsx code is correct.

