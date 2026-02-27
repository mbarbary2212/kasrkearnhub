

## Next Batch: 3 Quick Fixes

Based on the engineer's review, here are the next three items — all straightforward, no architectural changes.

---

### Fix 1: Text overflow in discussions

**Problem**: Long unbroken text (no spaces) overflows horizontally in discussion threads and study group messages.

**Changes:**

| File | Line | Change |
|------|------|--------|
| `src/components/discussion/ThreadView.tsx` | 106 | Add `break-all` to the message `<p>` tag |
| `src/components/study-groups/GroupThreadView.tsx` | ~177 | Add `break-all` to message content `<p>` tag |
| `src/components/coach/AskCoachPanel.tsx` | ~416 | Add `break-all` to chat message div |

---

### Fix 2: Double close button on coach panel

**Problem**: `SheetContent` (sheet.tsx line 60) renders a built-in X close button. `AskCoachPanel` manually adds another X button at lines 275-282 (error state) and 326-333 (normal state). Result: two overlapping X icons.

**Fix**: Remove the manual X buttons from `AskCoachPanel.tsx` at both locations (lines 275-282 and 326-333). The built-in SheetContent close button handles it.

---

### Fix 3: CSP headers in vercel.json

**Problem**: No Content-Security-Policy headers. The app serves without any CSP, which is a security gap.

**Fix**: Add a `headers` block to `vercel.json` with a CSP that allows `self`, Supabase domains, and necessary inline styles:

```json
{
  "rewrites": [...],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; media-src 'self' blob: https:; frame-src 'self' https://player.vimeo.com https://www.youtube.com;"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

---

### Files to change

| File | What |
|------|------|
| `src/components/discussion/ThreadView.tsx` | Add `break-all` to message text |
| `src/components/study-groups/GroupThreadView.tsx` | Add `break-all` to message text |
| `src/components/coach/AskCoachPanel.tsx` | Remove 2 duplicate X close buttons |
| `vercel.json` | Add CSP + security headers |

4 files, all small changes.

