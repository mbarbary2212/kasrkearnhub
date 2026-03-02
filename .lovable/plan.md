

## Fix: PDF Viewer Blocked in Infographics

### Root Cause

The "This content is blocked" error is a **Content Security Policy (CSP) violation**. The `frame-src` directive in `vercel.json` only allows:

```
frame-src 'self' https://player.vimeo.com https://www.youtube.com;
```

Your PDF files are hosted on **Supabase Storage** (`https://*.supabase.co`), but that domain is not in `frame-src`. When the `InfographicViewer` loads a PDF in an `<iframe>`, the browser blocks it.

### Fix

**File:** `vercel.json` — add `https://*.supabase.co` to the `frame-src` directive:

```
frame-src 'self' https://player.vimeo.com https://www.youtube.com https://*.supabase.co;
```

Single line change. No other files affected.

